import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { aggregateState, goldQuoteState, keyAuthState, statusDays } from './service-status';
describe('truthful service availability', () => {
  it('never marks missing history operational', () => {
    const days = statusDays([], ['api'], '2026-11-16T11:00:00Z');
    assert.equal(days.length, 90);
    assert.equal(days.every(d => d.state === 'unknown' && d.count === 0), true);
  });
  it('requires observations for every grouped service', () => {
    const days = statusDays([{ service: 'api', state: 'operational', checked_at: '2026-11-16T10:00:00Z' }], ['api', 'docs'], '2026-11-16T11:00:00Z');
    assert.equal(days[89]?.state, 'unknown');
  });
  it('retains recorded disruptions rather than replacing with current success', () => {
    const days = statusDays([{ service: 'api', state: 'unavailable', checked_at: '2026-11-16T09:00:00Z' }, { service: 'api', state: 'operational', checked_at: '2026-11-16T10:00:00Z' }], ['api'], '2026-11-16T11:00:00Z');
    assert.equal(days[89]?.state, 'unavailable');
  });
  it('unknown checks cannot produce all operational', () => assert.equal(aggregateState(['operational','unknown']), 'unknown'));
  it('only a timestamped fresh Gold quote is operational', () => {
    const now = Date.parse('2026-11-16T11:00:00Z');
    assert.equal(goldQuoteState(4000, '2026-11-16T10:59:00Z', now), 'operational');
    assert.equal(goldQuoteState(4000, '2026-11-16T10:00:00Z', now), 'degraded');
    assert.equal(goldQuoteState(4000, undefined, now), 'unknown');
  });
  it('API key check passes only when a keyless call is rejected with the auth error', () => {
    assert.equal(keyAuthState(401, { error: { type: 'invalid_request_error' } }), 'operational');
    assert.equal(keyAuthState(200, { choices: [] }), 'degraded');
    assert.equal(keyAuthState(502, null), 'unavailable');
  });
});
