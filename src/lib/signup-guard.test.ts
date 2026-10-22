import { describe, it as test } from 'node:test'
import { expect } from './chart/test-expect'
import { companyDomainVerdict, ipSubnet, isDisposableMx, splitFingerprint } from './signup-guard'
import { isDisposableEmail } from './disposable-email-domains'

describe('signup guard', () => {
  test('company domain allows 4 existing accounts, blocks the 6th', () => {
    expect(companyDomainVerdict(4, 0)).toBeNull()
    expect(companyDomainVerdict(5, 0)).not.toBeNull()
  })
  test('company domain burst of 2 in an hour blocks', () => {
    expect(companyDomainVerdict(1, 2)).not.toBeNull()
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
})
