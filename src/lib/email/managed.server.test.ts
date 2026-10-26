import { test } from 'node:test'
import assert from 'node:assert/strict'
import { SENDER_DOMAIN, FROM_DOMAIN } from './managed.server'

test('app email uses the requested notify.jenvu.net sending domain', () => {
  assert.equal(SENDER_DOMAIN, 'notify.jenvu.net')
  assert.equal(FROM_DOMAIN, 'jenvu.com')
})