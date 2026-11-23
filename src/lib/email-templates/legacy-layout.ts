import { COLORS, INTER, LOGO_URL } from './_shared'
import { EMAIL_ART } from './_visuals'

/** Presentation only: body is existing trusted markup with recipient values escaped by the caller. */
export function legacyEmailLayout(title: string, tag: string, body: string, actions = '') {
  const safe = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
  return `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;background:${COLORS.bg};font-family:${INTER};color:${COLORS.ink};padding:24px 10px">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%"><tr><td align="center">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:560px;border:1px solid ${COLORS.border};border-radius:8px;background:${COLORS.card}"><tr><td style="padding:32px 24px 28px;overflow-wrap:anywhere">
  <div style="text-align:center"><img src="${LOGO_URL}" width="26" height="26" alt="Jenvu" style="vertical-align:middle" /><span style="font-size:22px;vertical-align:middle;margin-left:10px">Jenvu</span></div>
  <h1 style="font-size:26px;line-height:1.33;font-weight:400;text-align:center;margin:24px 0 14px">${safe(title)}</h1>
  <div style="text-align:center;font-size:13px;color:${COLORS.muted};margin-bottom:22px">${safe(tag)}</div>
  <div style="border-top:1px solid ${COLORS.hairline};text-align:center;padding:24px 0"><img src="${EMAIL_ART.security}" width="160" alt="Account and security" style="max-width:100%;height:auto" /></div>
  <div style="font-size:15px;line-height:1.65;color:${COLORS.body};overflow-wrap:anywhere">${body}</div>
  ${actions ? `<div style="text-align:center;padding:22px 0 8px">${actions}</div>` : ''}
  <div style="border-top:1px solid ${COLORS.hairline};padding-top:18px;margin-top:24px;font-size:12px;line-height:1.6;color:${COLORS.muted};text-align:center">This email concerns your Jenvu account or application.<br/><a href="https://support.jenvu.com" style="color:${COLORS.body}">Help</a> · <a href="https://jenvu.com/privacy" style="color:${COLORS.body}">Privacy</a> · Jenvu<br/>Trading involves risk. Jenvu tools do not guarantee profits.</div>
  </td></tr></table></td></tr></table></body></html>`
}