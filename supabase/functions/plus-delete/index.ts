// Νομόσιο+ — διαγραφή λογαριασμού από τον ίδιο τον χρήστη.
//
// Απόφαση ιδιοκτήτη 14.9.2026: η διαγραφή δεν κοστίζει. Αν υπάρχει ενεργή συνδρομή,
// επιστρέφονται αναλογικά τα χρήματα για τον χρόνο που δεν χρησιμοποιήθηκε. Μέσα στις
// 14 πρώτες ημέρες από την ΠΡΩΤΗ πληρωμή επιστρέφεται ολόκληρη (όροι, ενότητα 5).
//
// Σειρά: επιστροφή χρημάτων → ακύρωση συνδρομής → διαγραφή πελάτη Stripe → διαγραφή λογαριασμού.
// Αν αποτύχει οποιοδήποτε βήμα της Stripe, ΔΕΝ σβήνεται ο λογαριασμός: ο χρήστης ξαναδοκιμάζει
// και δεν χάνει ούτε χρήματα ούτε πρόσβαση. Η επιστροφή έχει idempotency key, άρα δεν γίνεται δύο φορές.
// Οι συγκαταθέσεις μένουν χωρίς όνομα, ως απόδειξη. Οι αποδείξεις πληρωμής μένουν στη Stripe.
import { withSupabase } from 'npm:@supabase/server@1.6.0'
import type Stripe from 'npm:stripe@22.6.2'
import { type Member, isActiveMember, json, stripeCode, stripeFromEnv, withCors } from '../_shared/plus.ts'

const DAY = 86400

// Βρίσκει την πληρωμή πίσω από ένα τιμολόγιο. Νεότερες εκδόσεις του API: invoicePayments· παλιότερες: invoice.payment_intent / charge.
async function paymentOf(stripe: Stripe, inv: Stripe.Invoice): Promise<{ payment_intent?: string; charge?: string }> {
  try {
    const list = await stripe.invoicePayments.list({ invoice: inv.id!, limit: 10 })
    // deno-lint-ignore no-explicit-any
    const paid = list.data.find((p: any) => p.status === 'paid') as any
    const pi = paid?.payment?.payment_intent
    const ch = paid?.payment?.charge
    if (pi) return { payment_intent: typeof pi === 'string' ? pi : pi.id }
    if (ch) return { charge: typeof ch === 'string' ? ch : ch.id }
  } catch (e) {
    if (stripeCode(e) !== 'resource_missing') console.warn('plus-delete: invoicePayments unavailable', stripeCode(e))
  }
  // deno-lint-ignore no-explicit-any
  const i = inv as any
  if (i.payment_intent) return { payment_intent: typeof i.payment_intent === 'string' ? i.payment_intent : i.payment_intent.id }
  if (i.charge) return { charge: typeof i.charge === 'string' ? i.charge : i.charge.id }
  throw new Error(`no payment found for invoice ${inv.id}`)
}

async function refundUnused(stripe: Stripe, subId: string): Promise<number> {
  const sub = await stripe.subscriptions.retrieve(subId, { expand: ['latest_invoice'] })
  const inv = sub.latest_invoice as Stripe.Invoice | null
  if (!inv || typeof inv === 'string' || !inv.amount_paid) return 0

  // deno-lint-ignore no-explicit-any
  const item = sub.items.data[0] as any
  // deno-lint-ignore no-explicit-any
  const start: number | undefined = item?.current_period_start ?? (sub as any).current_period_start
  // deno-lint-ignore no-explicit-any
  const end: number | undefined = item?.current_period_end ?? (sub as any).current_period_end
  const now = Math.floor(Date.now() / 1000)
  if (!start || !end || end <= now || end <= start) return 0

  const firstPayment = inv.billing_reason === 'subscription_create'
  const amount = firstPayment && now - start <= 14 * DAY
    ? inv.amount_paid
    : Math.floor(inv.amount_paid * (end - now) / (end - start))
  if (amount <= 0) return 0

  const payment = await paymentOf(stripe, inv)
  await stripe.refunds.create(
    {
      ...payment,
      amount,
      reason: 'requested_by_customer',
      metadata: { app: 'nomosio', why: amount === inv.amount_paid ? 'delete_within_14_days' : 'delete_prorata' },
    },
    { idempotencyKey: `nomosio-delete-refund-${subId}` },
  )
  return amount
}

const handler = withSupabase({ auth: 'user' }, async (req, ctx) => {
  if (req.method !== 'POST') return json({ error: 'method' }, 405)
  const uid = ctx.userClaims?.id
  if (!uid) return json({ error: 'sign_in_first' }, 401)

  const body = await req.json().catch(() => ({}))
  if (body?.confirm !== 'delete') return json({ error: 'confirm_required' }, 400)

  // deno-lint-ignore no-explicit-any
  const db: any = ctx.supabaseAdmin
  const { data: memberRow, error: readErr } = await db
    .from('nomosio_members').select('*').eq('user_id', uid).maybeSingle()
  if (readErr) return json({ error: 'db' }, 500)
  const member = memberRow as Member | null

  let refundedCents = 0
  if (member?.stripe_customer) {
    const s = stripeFromEnv()
    // Χωρίς κλειδί Stripe δεν μπορούμε να σταματήσουμε τη χρέωση: δεν σβήνουμε μισή δουλειά.
    if (!s) return json({ error: 'payments_not_configured' }, 503)
    if (member.livemode === s.live) {
      try {
        if (member.stripe_subscription && isActiveMember(member, s.live)) {
          refundedCents = await refundUnused(s.stripe, member.stripe_subscription)
          try {
            await s.stripe.subscriptions.cancel(member.stripe_subscription)
          } catch (e) {
            if (stripeCode(e) !== 'resource_missing') throw e
          }
        }
        try {
          await s.stripe.customers.del(member.stripe_customer)
        } catch (e) {
          if (stripeCode(e) !== 'resource_missing') throw e
        }
      } catch (e) {
        console.error('plus-delete: stripe failed', stripeCode(e), (e as Error)?.message)
        return json({ error: 'stripe' }, 502)
      }
    }
  }

  const { error: delErr } = await db.auth.admin.deleteUser(uid)
  if (delErr) return json({ error: 'db', refunded_cents: refundedCents }, 500)
  return json({ deleted: true, refunded_cents: refundedCents })
})

Deno.serve(withCors(handler))
