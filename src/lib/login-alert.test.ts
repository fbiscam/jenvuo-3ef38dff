import { describe, expect, it } from 'bun:test'
import { shouldAlertLogin } from './login-alert'

const now = Date.parse('2026-10-30T06:00:00Z')
const past = [{ ip: '1.1.1.1', fingerprint: 'dev-a' }]

describe('shouldAlertLogin', () => {
  it('alerts once for a new IP and new device', () => {
    expect(shouldAlertLogin({ ip: '2.2.2.2', fingerprint: 'dev-b', pastLogins: past, recentAlerts: [], now })).toBe(true)
  })
  it('never alerts when the IP is unknown', () => {
    expect(shouldAlertLogin({ ip: '', fingerprint: 'dev-b', pastLogins: past, recentAlerts: [], now })).toBe(false)
  })
  it('does not alert again for the same IP within 24 hours', () => {
    const recentAlerts = [{ ip: '2.2.2.2', created_at: '2026-10-29T20:00:00Z' }]
    expect(shouldAlertLogin({ ip: '2.2.2.2', fingerprint: 'dev-c', pastLogins: past, recentAlerts, now })).toBe(false)
  })
  it('does not send a second alert within 10 minutes', () => {
    const recentAlerts = [{ ip: '3.3.3.3', created_at: '2026-10-30T05:55:00Z' }]
    expect(shouldAlertLogin({ ip: '2.2.2.2', fingerprint: 'dev-b', pastLogins: past, recentAlerts, now })).toBe(false)
  })
  it('does not alert for a known device', () => {
    expect(shouldAlertLogin({ ip: '2.2.2.2', fingerprint: 'dev-a', pastLogins: past, recentAlerts: [], now })).toBe(false)
  })
})
