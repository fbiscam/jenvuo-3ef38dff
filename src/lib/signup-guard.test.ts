import { describe, it as test } from 'node:test'
import { expect } from './chart/test-expect'
import { EMAIL_ALREADY_REGISTERED, signupEmailBlock, emailOwnershipConflict, companyDomainVerdict, ipSubnet, isDisposableMx, splitFingerprint, trustedSignupIpCap } from './signup-guard'
import { isDisposableEmail } from './disposable-email-domains'

describe('signup guard', () => {
  test('an already registered email cannot sign up again', () => {
    expect(signupEmailBlock({ email_confirmed_at: '2026-11-01T00:00:00Z' })).toBe(EMAIL_ALREADY_REGISTERED)
    expect(signupEmailBlock({ confirmed_at: '2026-11-01T00:00:00Z' })).toBe(EMAIL_ALREADY_REGISTERED)
  })
  test('a new or unconfirmed email can sign up', () => {
    expect(signupEmailBlock(null)).toBe(null)
    expect(signupEmailBlock({ email_confirmed_at: null, confirmed_at: null })).toBe(null)
  })
  test('company domain allows multiple accounts', () => {
    expect(companyDomainVerdict(4, 0)).toBe(null)
    expect(companyDomainVerdict(500, 0)).toBe(null)
  })
  test('company account count does not block shared-domain signup', () => {
    expect(companyDomainVerdict(100, 20)).toBe(null)
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
  test('trusted networks have no account cap', () => {
    expect(trustedSignupIpCap('153.117.68.156')).toBe(Infinity)
    expect(trustedSignupIpCap(' 153.117.68.156 ')).toBe(Infinity)
    expect(trustedSignupIpCap('153.117.68.157')).toBe(null)
    expect(trustedSignupIpCap('')).toBe(null)
  })
})

describe('multiple accounts per person', () => {
  const signup = { ip: '203.0.113.9', browser: 'b'.repeat(32), hardware: 'h'.repeat(32) }
  test('no account cap per IP', async () => {
    const { MAX_ACCOUNTS_PER_IP } = await import('./signup-guard')
    expect(MAX_ACCOUNTS_PER_IP).toBe(Infinity)
  })
  test('allowed when another account signed in from the same Wi-Fi', async () => {
    const { personLinkVerdict } = await import('./signup-guard')
    expect(personLinkVerdict(signup, [{ user_id: 'u1', ip: '203.0.113.9', fingerprint: 'zzz' }])).toBe(null)
  })
  test('allowed when the same laptop signed in to another account', async () => {
    const { personLinkVerdict } = await import('./signup-guard')
    expect(personLinkVerdict(signup, [{ user_id: 'u1', ip: '1.1.1.1', fingerprint: 'h'.repeat(32) }])).toBe(null)
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

 describe('one email per account', () => {
  test('another account cannot claim an owned email', () => {
    expect(emailOwnershipConflict('account-one', 'account-two')).toBe(true)
  })
  test('the owner may keep its email', () => {
    expect(emailOwnershipConflict('account-one', 'account-one')).toBe(false)
  })
  test('an unlinked email may be added', () => {
    expect(emailOwnershipConflict(null, 'account-two')).toBe(false)
  })
})
