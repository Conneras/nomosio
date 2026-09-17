// Νομόσιο+ — ανοίγει τη σελίδα της Stripe όπου ο συνδρομητής ακυρώνει,
// αλλάζει κάρτα ή κατεβάζει αποδείξεις. Μόνο για τον ίδιο, με τον δικό του λογαριασμό.
import { withSupabase } from 'npm:@supabase/server@1.6.0'
import type Stripe from 'npm:stripe@22.6.2'
import { type Member, SITE, json, siteOf, stripeCode, stripeFromEnv, withCors } from '../_shared/plus.ts'

// Η ρύθμιση της σελίδας διαχείρισης φτιάχνεται μία φορά από εδώ, όχι με κλικ στο dashboard.
async function portalConfiguration(stripe: Stripe): Promise<string> {
  const list = await stripe.billingPortal.configurations.list({ active: true, limit: 100 })
  const mine = list.data.find((c) => c.metadata?.app === 'nomosio_plus')
  if (mine) return mine.id
  const cfg = await stripe.billingPortal.configurations.create(
    {
      business_profile: {
        headline: 'Νομόσιο+ · διαχείριση συνδρομής',
        privacy_policy_url: `${SITE}/oroi#aporrito`,
        terms_of_service_url: `${SITE}/oroi`,
      },
      features: {
        invoice_history: { enabled: true },
        payment_method_update: { enabled: true },
        customer_update: { enabled: false },
        subscription_cancel: {
          enabled: true,
          mode: 'at_period_end',
          cancellation_reason: { enabled: true, options: ['too_expensive', 'unused', 'missing_features', 'other'] },
        },
      },
      metadata: { app: 'nomosio_plus' },
    },
    { idempotencyKey: 'nomosio-portal-config-v1' },
  )
  return cfg.id
}

const handler = withSupabase({ auth: 'user' }, async (req, ctx) => {
  if (req.method !== 'POST') return json({ error: 'method' }, 405)
  const uid = ctx.userClaims?.id
  if (!uid) return json({ error: 'sign_in_first' }, 401)

  const s = stripeFromEnv()
  if (!s) return json({ error: 'payments_not_configured' }, 503)
  const { stripe, live } = s

  const { data: member, error } = await ctx.supabaseAdmin
    .from('nomosio_members').select('*').eq('user_id', uid).maybeSingle<Member>()
  if (error) return json({ error: 'db' }, 500)
  if (!member?.stripe_customer || member.livemode !== live) return json({ error: 'no_customer' }, 404)

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: member.stripe_customer,
      configuration: await portalConfiguration(stripe),
      return_url: `${siteOf(req)}/kiniseis`,
      locale: 'el',
    })
    return json({ url: session.url })
  } catch (e) {
    console.error('plus-portal: stripe failed', stripeCode(e), (e as Error)?.message)
    return json({ error: 'stripe' }, 502)
  }
})

Deno.serve(withCors(handler))
