// Νομόσιο+ — ανοίγει πληρωμή Stripe για τον συνδεδεμένο χρήστη.
//
// Σειρά ελέγχων: συνδεδεμένος 401 → γνωστό πλάνο 400 → συγκαταθέσεις 400 →
// Stripe ρυθμισμένο 503 → όχι ήδη ενεργός συνδρομητής 409.
//
// Η πρόσβαση ΔΕΝ ανοίγει εδώ. Ανοίγει μόνο όταν το plus-webhook λάβει από τη Stripe
// ότι η πληρωμή έγινε. Ο αγοραστής μπορεί να μη γυρίσει ποτέ στη σελίδα.
import { withSupabase } from 'npm:@supabase/server@1.6.0'
import type Stripe from 'npm:stripe@22.6.2'
import {
  type Member,
  type Plan,
  PLANS,
  TERMS_VERSION,
  euro,
  isActiveMember,
  json,
  siteOf,
  stripeCode,
  stripeFromEnv,
  withCors,
} from '../_shared/plus.ts'

// Σταθερό id προϊόντος: μία δημιουργία, χωρίς αναζήτηση, χωρίς διπλά προϊόντα.
const PRODUCT_ID = 'nomosio_plus'

async function ensureProduct(stripe: Stripe): Promise<string> {
  try {
    return (await stripe.products.retrieve(PRODUCT_ID)).id
  } catch (e) {
    if (stripeCode(e) !== 'resource_missing') throw e
  }
  try {
    const p = await stripe.products.create({
      id: PRODUCT_ID,
      name: 'Νομόσιο+',
      description: 'Πρόσβαση σε όλες τις Έξυπνες Κινήσεις του nomosio.gr',
      tax_code: 'txcd_10000000',
      metadata: { app: 'nomosio' },
    })
    return p.id
  } catch (e) {
    if (stripeCode(e) === 'resource_already_exists') return PRODUCT_ID
    throw e
  }
}

// Για τη δοκιμή του ιδιοκτήτη με μικρή πραγματική χρέωση: secret PLUS_PRICE_OVERRIDE_CENTS=100.
// Φτιάχνει ξεχωριστή τιμή με δικό της lookup key, ώστε η κανονική τιμή να μην αγγίζεται ποτέ.
async function priceFor(stripe: Stripe, plan: Plan): Promise<{ id: string; cents: number }> {
  const p = PLANS[plan]
  const override = Number(Deno.env.get('PLUS_PRICE_OVERRIDE_CENTS') ?? '')
  const cents = override > 0 ? override : p.cents
  const lookup = override > 0 ? `${p.lookup}_test_${cents}` : p.lookup

  const found = await stripe.prices.list({ lookup_keys: [lookup], active: true, limit: 1 })
  if (found.data[0]) return { id: found.data[0].id, cents: found.data[0].unit_amount ?? cents }

  const price = await stripe.prices.create(
    {
      product: await ensureProduct(stripe),
      currency: 'eur',
      unit_amount: cents,
      recurring: { interval: p.interval },
      tax_behavior: 'inclusive',
      lookup_key: lookup,
      nickname: lookup,
    },
    { idempotencyKey: `nomosio-price-${lookup}` },
  )
  return { id: price.id, cents }
}

const handler = withSupabase({ auth: 'user' }, async (req, ctx) => {
  if (req.method !== 'POST') return json({ error: 'method' }, 405)
  const uid = ctx.userClaims?.id
  const email = ctx.userClaims?.email
  if (!uid || !email) return json({ error: 'sign_in_first' }, 401)

  const body = await req.json().catch(() => ({}))
  const plan = body?.plan as Plan
  if (!Object.hasOwn(PLANS, plan)) return json({ error: 'unknown_plan' }, 400)
  if (body?.waiver !== true || body?.terms !== true) return json({ error: 'consent_required' }, 400)

  const s = stripeFromEnv()
  if (!s) return json({ error: 'payments_not_configured' }, 503)
  const { stripe, live } = s
  // Οι πίνακες του Νομόσιου δεν έχουν παραγμένους τύπους: τις στήλες τις ελέγχει η ίδια η βάση (002_plus.sql).
  // deno-lint-ignore no-explicit-any
  const db: any = ctx.supabaseAdmin

  const { data: memberRow, error: readErr } = await db
    .from('nomosio_members').select('*').eq('user_id', uid).maybeSingle()
  const member = memberRow as Member | null
  if (readErr) return json({ error: 'db' }, 500)
  if (isActiveMember(member, live)) return json({ error: 'already_member' }, 409)

  try {
    // Ένας πελάτης Stripe ανά άνθρωπο. Ο πελάτης της δοκιμαστικής λειτουργίας
    // δεν μεταφέρεται στην πραγματική: εκεί φτιάχνεται καινούριος.
    let customer = member && member.livemode === live ? member.stripe_customer : null
    if (!customer) {
      const c = await stripe.customers.create(
        { email, metadata: { app: 'nomosio', user_id: uid } },
        { idempotencyKey: `nomosio-customer-${uid}-${live ? 'live' : 'test'}` },
      )
      customer = c.id
      const { error } = await db.from('nomosio_members').upsert({
        user_id: uid,
        email,
        livemode: live,
        stripe_customer: customer,
        stripe_subscription: null,
        plan: null,
        status: 'none',
        current_period_end: null,
        cancel_at_period_end: false,
        refunded_at: null,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' })
      if (error) return json({ error: 'db' }, 500)
    }

    // Η συγκατάθεση γράφεται ΠΡΙΝ την πληρωμή, με ώρα και έκδοση όρων.
    const { data: consents, error: consentErr } = await db.from('nomosio_consents').insert([
      { user_id: uid, stripe_customer: customer, kind: 'withdrawal_waiver', terms_version: TERMS_VERSION, plan },
      { user_id: uid, stripe_customer: customer, kind: 'terms', terms_version: TERMS_VERSION, plan },
    ]).select('id')
    if (consentErr) return json({ error: 'db' }, 500)

    const price = await priceFor(stripe, plan)
    const site = siteOf(req)
    const minute = Math.floor(Date.now() / 60000)
    const session = await stripe.checkout.sessions.create(
      {
        mode: 'subscription',
        customer,
        client_reference_id: uid,
        line_items: [{ price: price.id, quantity: 1 }],
        locale: 'el',
        success_url: `${site}/kiniseis?plus=ok`,
        cancel_url: `${site}/kiniseis?plus=cancel`,
        subscription_data: { metadata: { app: 'nomosio', user_id: uid, plan } },
        metadata: { app: 'nomosio', user_id: uid, plan, terms_version: TERMS_VERSION, consent_at: new Date().toISOString() },
        custom_text: {
          submit: {
            // Νομικός έλεγχος 14.9.2026: δίπλα στο τελικό κουμπί πρέπει να λέει ότι η αγορά σημαίνει υποχρέωση πληρωμής.
            message: `Πατώντας το κουμπί αγοράζεις συνδρομή με υποχρέωση πληρωμής: ${euro(price.cents)} ${plan === 'year' ? 'τον χρόνο' : 'τον μήνα'} με ΦΠΑ. ` +
              `Ανανεώνεται αυτόματα ${PLANS[plan].label} στην ίδια τιμή, μέχρι να την ακυρώσεις από τη σελίδα Έξυπνες Κινήσεις.`,
          },
        },
        ...(Deno.env.get('STRIPE_AUTOMATIC_TAX') === '1' ? { automatic_tax: { enabled: true } } : {}),
      },
      // Δύο πατήματα ή δύο καρτέλες μέσα στο ίδιο λεπτό δίνουν την ίδια πληρωμή, όχι δύο.
      { idempotencyKey: `nomosio-checkout-${uid}-${plan}-${price.cents}-${minute}` },
    )

    const ids = (consents ?? []).map((c: { id: string }) => c.id)
    if (ids.length) await db.from('nomosio_consents').update({ checkout_session: session.id }).in('id', ids)

    return json({ url: session.url })
  } catch (e) {
    console.error('plus-checkout: stripe failed', stripeCode(e), (e as Error)?.message)
    return json({ error: 'stripe' }, 502)
  }
})

Deno.serve(withCors(handler))
