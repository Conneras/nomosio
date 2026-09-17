// Κοινά για τις edge functions του Νομόσιου+: τιμές, CORS, Stripe, κανόνας «ενεργός συνδρομητής».
import Stripe from 'npm:stripe@22.6.2'

export const SITE = 'https://nomosio.gr'

// Η έκδοση των όρων που αποδέχεται ο αγοραστής. Αλλάζει μαζί με το κείμενο της /oroi.
export const TERMS_VERSION = 'oroi-2026-09-15'

// Στοιχεία πωλητή, ίδια με την ενότητα 1 της /oroi. Μέχρι να συμπληρωθούν ΔΕΝ στέλνεται
// email επιβεβαίωσης αγοράς (και το build της σελίδας σταματά), ώστε να μη φύγει ποτέ κενό.
// Χωρίς αριθμό ΓΕΜΗ: απόφαση ιδιοκτήτη 17.9.2026.
export const SELLER = {
  name: '{{ΣΥΜΠΛΗΡΩΣΗ: επωνυμία στα ελληνικά}} (TRADE VESSEL P.C.)',
  address: '{{ΣΥΜΠΛΗΡΩΣΗ: διεύθυνση}}, Σαντορίνη',
  afm: '800720400',
  email: 'info@tradevessel.com',
}
export const sellerReady = () => !Object.values(SELLER).some((v) => v.includes('{{'))

// Οι τιμές ζουν ΕΔΩ και πουθενά αλλού. Κάθε ποσό που γράφει η σελίδα πρέπει να ταιριάζει με αυτά.
// Απόφαση ιδιοκτήτη 14.9.2026: 5 € τον μήνα ή 49 € τον χρόνο, με ΦΠΑ μέσα.
export const PLANS = {
  month: { lookup: 'nomosio_plus_month', cents: 500, interval: 'month', label: 'κάθε μήνα' },
  year: { lookup: 'nomosio_plus_year', cents: 4900, interval: 'year', label: 'κάθε χρόνο' },
} as const
export type Plan = keyof typeof PLANS

export const euro = (cents: number) =>
  `${(cents / 100).toLocaleString('el-GR', { minimumFractionDigits: cents % 100 ? 2 : 0 })} €`

const ORIGINS = ['https://nomosio.gr', 'https://www.nomosio.gr', 'http://localhost:8317']

function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('origin') ?? ''
  return {
    'Access-Control-Allow-Origin': ORIGINS.includes(origin) ? origin : SITE,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
  }
}

// Ο browser ρωτά πρώτα με OPTIONS, χωρίς ταυτότητα: απαντάμε εδώ, πριν τον έλεγχο χρήστη.
// Κάθε άλλη απάντηση, και τα 401, παίρνει τα ίδια headers ώστε η σελίδα να διαβάσει το σφάλμα.
export function withCors(handler: (req: Request) => Promise<Response>) {
  return async (req: Request): Promise<Response> => {
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders(req) })
    const res = await handler(req)
    const headers = new Headers(res.headers)
    for (const [k, v] of Object.entries(corsHeaders(req))) headers.set(k, v)
    return new Response(res.body, { status: res.status, headers })
  }
}

export const json = (body: unknown, status = 200) => Response.json(body, { status })

// Πού επιστρέφει ο αγοραστής: στη σελίδα που κάλεσε, μόνο αν είναι δική μας.
export function siteOf(req: Request): string {
  const origin = req.headers.get('origin') ?? ''
  return ORIGINS.includes(origin) ? origin : SITE
}

export function stripeFromEnv(): { stripe: Stripe; live: boolean } | null {
  const key = Deno.env.get('STRIPE_SECRET_KEY')
  if (!key) return null
  return {
    stripe: new Stripe(key, { httpClient: Stripe.createFetchHttpClient() }),
    live: key.startsWith('sk_live_') || key.startsWith('rk_live_'),
  }
}

export type Member = {
  user_id: string
  email: string
  livemode: boolean
  stripe_customer: string | null
  stripe_subscription: string | null
  plan: string | null
  status: string
  current_period_end: string | null
  cancel_at_period_end: boolean
  refunded_at: string | null
}

// Ίδιος κανόνας με τη nomosio_moves() στη βάση (002_plus.sql). Αν αλλάξει εδώ, αλλάζει και εκεί.
export const ACTIVE_STATUSES = ['active', 'trialing', 'past_due']
export function isActiveMember(m: Member | null | undefined, live: boolean): boolean {
  return !!m && m.livemode === live && !m.refunded_at && ACTIVE_STATUSES.includes(m.status)
}

export function stripeCode(e: unknown): string {
  return (e as { code?: string })?.code ?? ''
}
