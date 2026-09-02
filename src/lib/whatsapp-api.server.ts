/**
 * Meta WhatsApp Cloud API helpers.
 *
 * Important: the configured WHATSAPP_PHONE_NUMBER_ID may actually be a
 * WhatsApp Business Account (WABA) id. Sending fails on a WABA id, so we
 * resolve the real phone-number id once and cache it.
 */

const GRAPH = 'https://graph.facebook.com/v21.0'

let cachedSenderId: string | null = null
let cachedDisplayNumber: string | null = null

function creds() {
  const token = process.env['WHATSAPP_ACCESS_TOKEN'] || process.env['WHATSAPP_API_TOKEN']
  const configuredId = process.env['WHATSAPP_PHONE_NUMBER_ID']
  if (!token || !configuredId) {
    throw new Error(
      'WhatsApp is not configured (WHATSAPP_ACCESS_TOKEN / WHATSAPP_PHONE_NUMBER_ID missing).',
    )
  }
  return { token, configuredId }
}

export async function resolveSender(): Promise<{ phoneNumberId: string; displayNumber: string | null }> {
  if (cachedSenderId) return { phoneNumberId: cachedSenderId, displayNumber: cachedDisplayNumber }
  const { token, configuredId } = creds()

  try {
    const res = await fetch(`${GRAPH}/${configuredId}/phone_numbers`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    const body = (await res.json()) as {
      data?: Array<{
        id: string
        display_phone_number?: string
        platform_type?: string
        code_verification_status?: string
      }>
    }
    const list = body.data ?? []
    if (list.length > 0) {
      const best =
        list.find(
          (p) => p.platform_type === 'CLOUD_API' && p.code_verification_status === 'VERIFIED',
        ) ??
        list.find((p) => p.platform_type === 'CLOUD_API') ??
        list[0]!
      cachedSenderId = best.id
      cachedDisplayNumber = best.display_phone_number ?? null
      return { phoneNumberId: cachedSenderId, displayNumber: cachedDisplayNumber }
    }
  } catch {
    // fall through — treat the configured id as a phone-number id
  }

  cachedSenderId = configuredId
  return { phoneNumberId: cachedSenderId, displayNumber: cachedDisplayNumber }
}

export function normalizePhone(raw: string): string {
  return raw.replace(/[^\d]/g, '')
}

async function post(path: string, payload: Record<string, unknown>) {
  const { token } = creds()
  const res = await fetch(`${GRAPH}/${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const body: any = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = body?.error
    const msg: string = err?.error_user_msg || err?.message || `WhatsApp API error ${res.status}`
    const e = new Error(msg) as Error & { code?: number }
    e.code = err?.code
    throw e
  }
  return body
}

/** Free-form text — only delivered inside the 24h customer service window. */
export async function sendWhatsappText(to: string, body: string) {
  const { phoneNumberId } = await resolveSender()
  return post(`${phoneNumberId}/messages`, {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: normalizePhone(to),
    type: 'text',
    text: { preview_url: false, body },
  })
}

export async function sendWhatsappTemplate(
  to: string,
  name: string,
  language: string,
  bodyParams: string[],
  otpButtonCode?: string,
) {
  const { phoneNumberId } = await resolveSender()
  const components: Array<Record<string, unknown>> = []
  if (bodyParams.length > 0) {
    components.push({
      type: 'body',
      parameters: bodyParams.map((text) => ({ type: 'text', text })),
    })
  }
  if (otpButtonCode) {
    components.push({
      type: 'button',
      sub_type: 'url',
      index: '0',
      parameters: [{ type: 'text', text: otpButtonCode }],
    })
  }
  return post(`${phoneNumberId}/messages`, {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: normalizePhone(to),
    type: 'template',
    template: {
      name,
      language: { code: language },
      ...(components.length > 0 ? { components } : {}),
    },
  })
}

export const OTP_TEMPLATE = { name: 'jenvu_verify_code', language: 'en_US' }
/**
 * Primary alert template. Meta re-categorised the older `jenvu_signal_alert`
 * as MARKETING (the opt-out wording made it promotional), so we prefer the
 * transactional UTILITY template and only fall back to the old one.
 */
export const ALERT_TEMPLATE = { name: 'jenvu_signal_update', language: 'en_US' }
export const LEGACY_ALERT_TEMPLATE = { name: 'jenvu_signal_alert', language: 'en_US' }

/** Sends the 6-digit verification code using the approved authentication template. */
export async function sendWhatsappOtp(to: string, code: string) {
  return sendWhatsappTemplate(to, OTP_TEMPLATE.name, OTP_TEMPLATE.language, [code], code)
}

/**
 * Sends an alert.
 *
 * The approved UTILITY template is used FIRST: free-form text is only
 * delivered inside the 24h customer-service window — outside it Meta still
 * returns 200 ("accepted") but silently drops the message, which is why
 * alerts looked "sent" while nothing arrived on the phone.
 *
 * After the template lands, the detailed free-form text is sent as a
 * best-effort follow-up (it reopens/uses the 24h window when available).
 */
export async function sendWhatsappAlertMessage(
  to: string,
  text: string,
  templateParams: [string, string],
) {
  const errors: string[] = []
  for (const tpl of [ALERT_TEMPLATE, LEGACY_ALERT_TEMPLATE]) {
    try {
      const res = await sendWhatsappTemplate(to, tpl.name, tpl.language, templateParams)
      // Best-effort rich detail message; ignore failures.
      try {
        await sendWhatsappText(to, text)
      } catch {
        /* outside 24h window */
      }
      return res
    } catch (e) {
      errors.push(`${tpl.name}: ${(e as Error).message}`)
    }
  }
  try {
    return await sendWhatsappText(to, text)
  } catch (e) {
    throw new Error(`${errors.join(' | ')} | text: ${(e as Error).message}`)
  }
}
