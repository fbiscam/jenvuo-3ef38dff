import { describe, it as test } from 'node:test'
import { expect } from './chart/test-expect'
import { companyDomainVerdict, ipSubnet, isDisposableMx, splitFingerprint, trustedSignupIpCap } from './signup-guard'
import { isDisposableEmail } from './disposable-email-domains'

describe('signup guard', () => {
  test('company domain allows 4 existing accounts, blocks the 6th', () => {
    expect(companyDomainVerdict(4, 0)).toBe(null)
    expect(companyDomainVerdict(5, 0) === null).toBe(false)
  })
  test('company domain burst of 2 in an hour blocks', () => {
    expect(companyDomainVerdict(1, 2) === null).toBe(false)
  })
  test('temp-mail providers the user named are blocked', () => {
    for (const d of ['temp-mail.org', 'temp-mail.io', 'tempail.com', 'yopmail.com', 'mail.tm', 'mailinator.com', 'guerrillamail.com', 'burnermail.io', 'emailondeck.com']) {
      expect(isDisposableEmail(`a@${d}`)).toBe(true)
    }
    expect(isDisposableEmail('a@gmail.com')).toBe(false)
  })
  test('disposable mail servers are detected', () => {
    expect(isDisposableMx('mx.mail.tm.')).toBe(true)
    expect(isDisposableMx('gmail-smtp-in.l.google.com')).toBe(false)
  })
  test('subnet and fingerprint parsing', () => {
    expect(ipSubnet('203.0.113.9')).toBe('203.0.113.')
    const fp = splitFingerprint('a'.repeat(64) + '_' + 'b'.repeat(40))
    expect(fp.browser).toBe('a'.repeat(64))
    expect(fp.hardware).toBe('b'.repeat(40))
  })
  test('trusted tester IP gets its own cap of 3, others get none', () => {
    expect(trustedSignupIpCap('153.117.68.156')).toBe(3)
    expect(trustedSignupIpCap(' 153.117.68.156 ')).toBe(3)
    expect(trustedSignupIpCap('153.117.68.157')).toBe(null)
    expect(trustedSignupIpCap('')).toBe(null)
  })
})

describe('one person, one account', () => {
  const signup = { ip: '203.0.113.9', browser: 'b'.repeat(32), hardware: 'h'.repeat(32) }
  test('only one account per IP', async () => {
    const { MAX_ACCOUNTS_PER_IP } = await import('./signup-guard')
    expect(MAX_ACCOUNTS_PER_IP).toBe(1)
  })
  test('blocked when another account signed in from the same Wi-Fi', async () => {
    const { personLinkVerdict } = await import('./signup-guard')
    expect(personLinkVerdict(signup, [{ user_id: 'u1', ip: '203.0.113.9', fingerprint: 'zzz' }]) === null).toBe(false)
  })
  test('blocked when the same laptop signed in to another account', async () => {
    const { personLinkVerdict } = await import('./signup-guard')
    expect(personLinkVerdict(signup, [{ user_id: 'u1', ip: '1.1.1.1', fingerprint: 'h'.repeat(32) }]) === null).toBe(false)
  })
  test('allowed for a new network and device', async () => {
    const { personLinkVerdict } = await import('./signup-guard')
    expect(personLinkVerdict(signup, [{ user_id: 'u1', ip: '1.1.1.1', fingerprint: 'x'.repeat(32) }])).toBe(null)
  })
  test('temp-mail domains from the picker are blocked', () => {
    for (const d of ['priyo.edu.pl', 'priyomail.org', 'auth2fa.com', 'priyomail.nl', 'yandex.bd', 'outlook.bd', 'priyomail.ovh', 'priyotv.net', 'priyoapk.com', 'priyodown.com', 'bpl-tv.com', 'bpltv.com', 'priyonew.xyz', 'gmail.bd']) {
      expect(isDisposableEmail(`a@${d}`)).toBe(true)
    }
    expect(isDisposableEmail('a@outlook.com')).toBe(false)
  })
})
