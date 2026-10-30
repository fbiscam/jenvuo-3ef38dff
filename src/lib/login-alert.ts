/** Pure rules for the "Suspicious login alert" (tested in login-alert.test.ts). */

export type PastLogin = { ip: string | null; fingerprint: string | null }
export type PastAlert = { ip: string | null; created_at: string }

/** No second alert for the same IP inside this window. */
export const ALERT_REPEAT_WINDOW_MS = 24 * 60 * 60 * 1000
/** No alert at all if any alert was sent this recently (stops parallel tabs/subdomains doubling up). */
export const ALERT_BURST_WINDOW_MS = 10 * 60 * 1000

/**
 * One sign-in gives at most one alert. Alerts only when the IP is known,
 * the account has signed in before, neither the IP nor the device has been
 * seen, and no alert for this IP (or any alert in the last 10 minutes) exists.
 */
export function shouldAlertLogin(input: {
  ip: string
  fingerprint: string
  pastLogins: PastLogin[]
  recentAlerts: PastAlert[]
  now: number
}): boolean {
  const { ip, fingerprint, pastLogins, recentAlerts, now } = input
  if (!ip) return false
  if (pastLogins.length === 0) return false
  if (pastLogins.some((r) => r.ip === ip)) return false
  if (fingerprint && pastLogins.some((r) => r.fingerprint === fingerprint)) return false
  for (const a of recentAlerts) {
    const age = now - new Date(a.created_at).getTime()
    if (age < ALERT_BURST_WINDOW_MS) return false
    if (a.ip === ip && age < ALERT_REPEAT_WINDOW_MS) return false
  }
  return true
}
