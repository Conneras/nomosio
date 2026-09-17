// Νομόσιο+ — το ΜΟΝΟ σημείο που ανοίγει ή κλείνει πρόσβαση.
//
// Η Stripe στέλνει εδώ κάθε αλλαγή. Κανόνες που δεν σπάνε:
// - Τίποτα δεν διαβάζεται πριν ελεγχθεί η υπογραφή της Stripe πάνω στο ωμό σώμα (400 αλλιώς).
// - Γεγονός άλλης λειτουργίας (test όταν τρέχουμε live, και το αντίθετο) αγνοείται.
// - Την κατάσταση της συνδρομής την ξαναρωτάμε από τη Stripe· δεν εμπιστευόμαστε ένα μόνο γεγονός.
// - Αποτυχία εγγραφής απαντά 500, ώστε η Stripe να ξαναστείλει. 200 σε αποτυχία = χαμένη πληρωμή.
// - Πλήρης επιστροφή χρημάτων κλείνει την πρόσβαση αμέσως. Η γραμμή σημαδεύεται, δεν σβήνεται.
// - Μετά την αγορά στέλνεται email επιβεβαίωσης με τους όρους (νομική υποχρέωση, σταθερό μέσο).
//   Αν το email αποτύχει, η πρόσβαση ανοίγει κανονικά και το σφάλμα γράφεται στα logs.
import { withSupabase } from 'npm:@supabase/server@1.6.0'
import Stripe from 'npm:stripe@22.6.2'
import {
  ACTIVE_STATUSES,
  type Member,
  PLANS,
  type Plan,
  SELLER,
  TERMS_VERSION,
  euro,
  json,
  sellerReady,
  stripeCode,
  stripeFromEnv,
} from '../_shared/plus.ts'

const crypto = Stripe.createSubtleCryptoProvider()

// deno-lint-ignore no-explicit-any
type Db = any

const esc = (s: unknown) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))
const athens = (d: Date) => d.toLocaleString('el-GR', { timeZone: 'Europe/Athens', dateStyle: 'long', timeStyle: 'short' })

function subscriptionIdOfInvoice(inv: Stripe.Invoice): string | null {
  // Στις νεότερες εκδόσεις του API η συνδρομή ζει στο parent· στις παλιότερες στο invoice.subscription.
  // deno-lint-ignore no-explicit-any
  const i = inv as any
  const s = i.parent?.subscription_details?.subscription ?? i.subscription
  return typeof s === 'string' ? s : s?.id ?? null
}

async function syncSubscription(stripe: Stripe, db: Db, subId: string, live: boolean, hintUserId?: string | null) {
  const sub = await stripe.subscriptions.retrieve(subId)
  if (sub.metadata?.app !== 'nomosio') return

  const userId = sub.metadata?.user_id || hintUserId
  if (!userId) throw new Error(`subscription ${sub.id} has no user_id`)

  const { data: existing, error: readErr } = await db
    .from('nomosio_members').select('*').eq('user_id', userId).maybeSingle()
  if (readErr) throw readErr
  const row = existing as Member | null

  // Μια παλιά συνδρομή που έληξε δεν σβήνει μια νέα που τρέχει.
  if (row?.stripe_subscription && row.stripe_subscription !== sub.id) {
    const rowActive = ACTIVE_STATUSES.includes(row.status) && !row.refunded_at
    const thisActive = ACTIVE_STATUSES.includes(sub.status)
    if (rowActive && !thisActive) return
    if (rowActive && thisActive) {
      // Δύο ενεργές συνδρομές στον ίδιο άνθρωπο: κρατάμε την πρώτη, ο ιδιοκτήτης επιστρέφει τη δεύτερη.
      console.error(`plus-webhook: DUPLICATE active subscription ${sub.id} for user ${userId}, kept ${row.stripe_subscription}. Refund and cancel the duplicate in Stripe.`)
      return
    }
  }

  let email = row?.email
  if (!email) {
    const { data, error } = await db.auth.admin.getUserById(userId)
    // Ο χρήστης διέγραψε τον λογαριασμό του (plus-delete): τα τελευταία γεγονότα της συνδρομής
    // του δεν έχουν πού να γραφτούν. Απαντάμε κανονικά, αλλιώς η Stripe θα ξαναστέλνει για μέρες.
    if (!data?.user && (!error || error.status === 404)) {
      console.warn(`plus-webhook: user ${userId} no longer exists, skipped ${sub.id}`)
      return
    }
    if (error || !data?.user?.email) throw new Error(`no email for user ${userId}`)
    email = data.user.email
  }

  const item = sub.items.data[0]
  // Η περίοδος χρέωσης ζει στο item στις νεότερες εκδόσεις του API.
  // deno-lint-ignore no-explicit-any
  const periodEnd = (item as any)?.current_period_end ?? (sub as any).current_period_end ?? null
  const customer = typeof sub.customer === 'string' ? sub.customer : sub.customer.id

  const { error: writeErr } = await db.from('nomosio_members').upsert({
    user_id: userId,
    email,
    livemode: live,
    stripe_customer: customer,
    stripe_subscription: sub.id,
    plan: item?.price?.recurring?.interval === 'year' ? 'year' : 'month',
    status: sub.status,
    current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
    cancel_at_period_end: sub.cancel_at_period_end || !!sub.cancel_at,
    // Η σήμανση επιστροφής ανήκει στη συνδρομή που επιστράφηκε· νέα συνδρομή ξεκινά καθαρή.
    refunded_at: row && row.stripe_subscription === sub.id ? row.refunded_at : null,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id' })
  // 23503: ο λογαριασμός σβήστηκε ανάμεσα στην ανάγνωση και την εγγραφή.
  if (writeErr?.code === '23503') {
    console.warn(`plus-webhook: user ${userId} deleted during sync of ${sub.id}`)
    return
  }
  if (writeErr) throw writeErr
}

async function handleRefund(stripe: Stripe, db: Db, charge: Stripe.Charge) {
  if (!charge.refunded) return // μερική επιστροφή (π.χ. αναλογική στη διαγραφή): δεν αγγίζει πρόσβαση
  const customer = typeof charge.customer === 'string' ? charge.customer : charge.customer?.id
  if (!customer) return

  const { data: row, error } = await db
    .from('nomosio_members').select('*').eq('stripe_customer', customer).maybeSingle()
  if (error) throw error
  if (!row) return

  const { error: markErr } = await db.from('nomosio_members')
    .update({ refunded_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('user_id', row.user_id)
  if (markErr) throw markErr

  if (row.stripe_subscription) {
    try {
      await stripe.subscriptions.cancel(row.stripe_subscription)
    } catch (e) {
      if (stripeCode(e) !== 'resource_missing') throw e
    }
  }
  console.warn(`plus-webhook: full refund on customer ${customer}, access closed for user ${row.user_id}`)
}

// Email επιβεβαίωσης αγοράς: τι αγόρασε, τιμή με ΦΠΑ, ανανέωση, ακύρωση, 14 ημέρες,
// η ώρα της επιβεβαίωσης πριν την πληρωμή, στοιχεία πωλητή και ολόκληροι οι όροι (terms.html,
// παράγεται από την ενότητα #oroi του index.html με tools/terms-email.js).
async function sendConfirmation(session: Stripe.Checkout.Session) {
  const key = Deno.env.get('RESEND_API_KEY')
  if (!key) return console.error(`plus-webhook: RESEND_API_KEY missing, no confirmation email for ${session.id}`)
  if (!sellerReady()) return console.error(`plus-webhook: seller details not filled in, no confirmation email for ${session.id}`)
  const terms = await Deno.readTextFile(new URL('./terms.html', import.meta.url)).catch(() => '')
  if (!terms || terms.includes('{{')) return console.error(`plus-webhook: terms.html missing or incomplete, no confirmation email for ${session.id}`)

  const to = session.customer_details?.email ?? session.customer_email
  if (!to) return console.error(`plus-webhook: no buyer email on ${session.id}`)

  const plan: Plan = session.metadata?.plan === 'year' ? 'year' : 'month'
  const price = euro(session.amount_total ?? PLANS[plan].cents)
  const per = plan === 'year' ? 'τον χρόνο' : 'τον μήνα'
  const started = athens(new Date(session.created * 1000))
  const consentAt = session.metadata?.consent_at ? athens(new Date(session.metadata.consent_at)) : 'πριν την πληρωμή'
  const version = session.metadata?.terms_version || TERMS_VERSION
  const seller = `${SELLER.name}, ${SELLER.address}, ΑΦΜ ${SELLER.afm}, ${SELLER.email}`

  const lines = [
    `Η συνδρομή σου στο Νομόσιο+ ξεκίνησε στις ${started}.`,
    `Πλάνο: ${plan === 'year' ? 'ετήσια' : 'μηνιαία'} συνδρομή, ${price} ${per}, με ΦΠΑ.`,
    `Ανανεώνεται αυτόματα ${PLANS[plan].label} στην ίδια τιμή, μέχρι να την ακυρώσεις.`,
    `Ακύρωση: από τη σελίδα https://nomosio.gr/kiniseis με το κουμπί «Διαχείριση συνδρομής», ή με email στο ${SELLER.email}. Κρατάς την πρόσβαση ως το τέλος της περιόδου που πλήρωσες.`,
    `Αν αλλάξεις γνώμη μέσα σε 14 ημέρες από αυτή την πρώτη πληρωμή, γράψε μας στο ${SELLER.email} με τη φράση «Υπαναχωρώ από τη συνδρομή Νομόσιο+» και σου επιστρέφουμε όλα τα χρήματα.`,
    `Πριν πληρώσεις ζήτησες να ανοίξουν οι κινήσεις αμέσως (${consentAt}) και αποδέχτηκες τους όρους, έκδοση ${version}. Οι όροι είναι ολόκληροι πιο κάτω.`,
    `Πωλητής: ${seller}.`,
  ]
  const html = `<div style="font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.55;color:#23262B;max-width:640px">
<p style="font-size:20px;letter-spacing:.12em;margin:0 0 16px">ΝΟΜΟΣΙΟ</p>
${lines.map((l) => `<p>${esc(l)}</p>`).join('\n')}
<hr style="border:none;border-top:1px solid #DCD5C6;margin:28px 0">
${terms}
</div>`

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      'Idempotency-Key': `nomosio-confirmation-${session.id}`,
    },
    body: JSON.stringify({
      from: 'Νομόσιο <syndromi@nomosio.gr>',
      to: [to],
      reply_to: SELLER.email,
      subject: 'Νομόσιο+: η συνδρομή σου ξεκίνησε',
      html,
      text: lines.join('\n\n') + '\n\nΟι όροι: https://nomosio.gr/oroi',
    }),
  })
  if (!res.ok) console.error(`plus-webhook: confirmation email failed for ${session.id}: ${res.status}`)
}

async function handler(req: Request, ctx: { supabaseAdmin: Db }): Promise<Response> {
  if (req.method !== 'POST') return json({ error: 'method' }, 405)

  const s = stripeFromEnv()
  const whsec = Deno.env.get('STRIPE_WEBHOOK_SECRET')
  if (!s || !whsec) return json({ error: 'payments_not_configured' }, 503)
  const { stripe, live } = s

  const body = await req.text()
  let event: Stripe.Event
  try {
    event = await stripe.webhooks.constructEventAsync(body, req.headers.get('stripe-signature') ?? '', whsec, undefined, crypto)
  } catch {
    return json({ error: 'bad_signature' }, 400)
  }

  if (event.livemode !== live) return json({ received: true, ignored: 'other_mode' })

  const db = ctx.supabaseAdmin
  const { data: seen, error: seenErr } = await db
    .from('nomosio_stripe_events').select('id').eq('id', event.id).maybeSingle()
  if (seenErr) return json({ error: 'db' }, 500)
  if (seen) return json({ received: true, already: true })

  try {
    const { error: modeErr } = await db.from('nomosio_plus_settings')
      .upsert({ key: 'stripe_livemode', value: String(live), updated_at: new Date().toISOString() })
    if (modeErr) throw modeErr

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        if (session.mode !== 'subscription' || session.metadata?.app !== 'nomosio') break
        const subId = typeof session.subscription === 'string' ? session.subscription : session.subscription?.id
        if (subId) await syncSubscription(stripe, db, subId, live, session.client_reference_id)
        await sendConfirmation(session).catch((e) => console.error('plus-webhook: confirmation email error', (e as Error)?.message))
        break
      }
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
      case 'customer.subscription.paused':
      case 'customer.subscription.resumed': {
        const sub = event.data.object as Stripe.Subscription
        if (sub.metadata?.app === 'nomosio') await syncSubscription(stripe, db, sub.id, live)
        break
      }
      case 'invoice.paid':
      case 'invoice.payment_failed': {
        const subId = subscriptionIdOfInvoice(event.data.object as Stripe.Invoice)
        if (subId) await syncSubscription(stripe, db, subId, live)
        break
      }
      case 'charge.refunded':
        await handleRefund(stripe, db, event.data.object as Stripe.Charge)
        break
      case 'charge.dispute.created': {
        const d = event.data.object as Stripe.Dispute
        console.error(`plus-webhook: DISPUTE ${d.id} on charge ${typeof d.charge === 'string' ? d.charge : d.charge?.id}. Answer it in Stripe before the evidence deadline.`)
        break
      }
    }
  } catch (e) {
    console.error(`plus-webhook: ${event.type} ${event.id} failed`, stripeCode(e), (e as Error)?.message)
    return json({ error: 'processing_failed' }, 500)
  }

  const { error: markErr } = await db.from('nomosio_stripe_events')
    .insert({ id: event.id, type: event.type, livemode: event.livemode })
  if (markErr && markErr.code !== '23505') return json({ error: 'db' }, 500)

  return json({ received: true })
}

Deno.serve(withSupabase({ auth: 'none' }, handler))
