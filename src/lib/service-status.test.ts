import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { aggregateState, candleFeedState, emailDeliveryState, emailDnsState, goldQuoteState, keyAuthState, statusDays, STATUS_GROUPS } from './service-status';
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
  it('every status section lists at least two services', () => {
    assert.equal(STATUS_GROUPS.every(g => g.services.length >= 2), true);
  });
  it('email domain shows red when its nameservers stop resolving', () => {
    assert.equal(emailDnsState({ Status: 0, Answer: [{ type: 2, data: 'ns3.lovable.cloud.' }] }), 'operational');
    assert.equal(emailDnsState({ Status: 3 }), 'unavailable');
    assert.equal(emailDnsState({ Status: 0, Answer: [] }), 'unavailable');
    assert.equal(emailDnsState(null), 'unknown');
  });
  it('email delivery shows red when the newest email failed', () => {
    const now = Date.parse('2026-11-23T12:00:00Z');
    assert.equal(emailDeliveryState([{ status: 'failed', at: '2026-11-23T11:00:00Z' }, { status: 'sent', at: '2026-11-23T10:00:00Z' }], now), 'unavailable');
    assert.equal(emailDeliveryState([{ status: 'sent', at: '2026-11-23T11:00:00Z' }, { status: 'failed', at: '2026-11-23T10:00:00Z' }], now), 'degraded');
    assert.equal(emailDeliveryState([{ status: 'sent', at: '2026-11-23T11:00:00Z' }], now), 'operational');
    assert.equal(emailDeliveryState([], now), 'unknown');
  });
  it('gold candle stream is operational only with a recent candle', () => {
    const now = Date.parse('2026-11-23T12:00:00Z');
    assert.equal(candleFeedState(now / 1000 - 60, '3600', now), 'operational');
    assert.equal(candleFeedState(now / 1000 - 3600, '3600', now), 'degraded');
    assert.equal(candleFeedState(undefined, '3600', now), 'unknown');
  });
});
