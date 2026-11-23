import { supabaseAdmin } from '@/integrations/supabase/client.server'
import { sendTemplateEmail } from './email-templates/send-email'
import { looksLikeGiftCode, normalizeGiftCode } from './plan-gift'

/** Fixed confirmation for the authenticated redeemer; no caller-selected recipient/template. */
export async function sendPromoActivation(userId: string, rawCode: string) {
  const { data: account, error: accountError } = await supabaseAdmin.auth.admin.getUserById(userId)
  if (accountError || !account.user?.email) throw new Error('Promo confirmation account unavailable')
  const isPlan = looksLikeGiftCode(rawCode)
  const code = isPlan ? normalizeGiftCode(rawCode) : rawCode.trim().toUpperCase()
  if (isPlan) {
    const { data: gift, error } = await supabaseAdmin.from('plan_gift_codes')
      .select('plan_id, plan_ends_at, redeemed_at').eq('code', code).eq('redeemed_by', userId).eq('status', 'redeemed').single()
    if (error || !gift?.plan_ends_at || !gift.redeemed_at) throw new Error('Redeemed plan gift unavailable')
    const [{ data: plan }, { data: lot }] = await Promise.all([
      supabaseAdmin.from('plans').select('wallet_usd').eq('id', gift.plan_id).single(),
      supabaseAdmin.from('credit_lots').select('expires_at').eq('user_id', userId)
        .gt('amount_remaining', 0).gt('expires_at', new Date().toISOString())
        .order('expires_at', { ascending: true }).limit(1).maybeSingle(),
    ])
    if (!plan || !lot?.expires_at) throw new Error('Gift credit expiry unavailable')
    return sendTemplateEmail('promo-activated', account.user.email, {
      idempotencyKey: `promo-activated:${userId}:${code}:${gift.redeemed_at}`,
      templateData: { kind: 'plan', planName: gift.plan_id.charAt(0).toUpperCase() + gift.plan_id.slice(1), creditAmount: Number(plan.wallet_usd), planEndsAt: gift.plan_ends_at, creditExpiresAt: lot.expires_at },
    })
  }
  const [{ data: redemption }, { data: lot }] = await Promise.all([
    supabaseAdmin.from('promo_redemptions').select('id, bonus_usd').eq('user_id', userId).eq('code', code)
      .order('created_at', { ascending: false }).limit(1).maybeSingle(),
    supabaseAdmin.from('credit_lots').select('expires_at').eq('user_id', userId).eq('reason', 'promo_bonus')
      .contains('metadata', { promo_code: code }).order('granted_at', { ascending: false }).limit(1).maybeSingle(),
  ])
  if (!redemption || !lot?.expires_at) throw new Error('Redeemed credit gift unavailable')
  return sendTemplateEmail('promo-activated', account.user.email, {
    idempotencyKey: `promo-activated:${redemption.id}`,
    templateData: { kind: 'credit', creditAmount: Number(redemption.bonus_usd), creditExpiresAt: lot.expires_at },
  })
}