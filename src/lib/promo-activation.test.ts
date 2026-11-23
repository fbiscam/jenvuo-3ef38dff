import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { QueryClient, QueryObserver } from '@tanstack/react-query';
import type { CreditState } from './credits.functions';
import { applyPromoSnapshot, completePromoActivation } from './promo-activation';

const pro: CreditState = {
  plan: { id: 'pro', name: 'Pro', price_usd: 69, wallet_usd: 40 },
  features: { journal: true, realtime_alerts: false, full_ict: true, scanner: true },
  balance: 40, allowance: 40, periodResetsAt: '2026-12-23T07:37:00Z',
  nextBillingDate: '2026-12-23T07:37:00Z', trial: { active: false, endsAt: null, daysLeft: 0 },
  recent: [], grants: [], promotions: [],
};

describe('promo activation updates and confirmation trigger', () => {
  it('updates shared plan and API credit observers without reloading or touching another account', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { enabled: false } } });
    const key = ['credit-state', 'recipient'];
    client.setQueryData(key, { ...pro, plan: { ...pro.plan, id: 'free' }, balance: 35 });
    client.setQueryData(['credit-state', 'other'], { balance: 99 });
    const observer = new QueryObserver<CreditState>(client, { queryKey: key, enabled: false });
    let observed: CreditState | undefined;
    const unsubscribe = observer.subscribe(result => { observed = result.data; });
    await applyPromoSnapshot(client, 'recipient', pro);
    assert.equal(observed?.plan.id, 'pro');
    assert.equal(observed?.balance, 40);
    assert.equal(observed?.nextBillingDate, '2026-12-23T07:37:00Z');
    assert.deepEqual(client.getQueryData(['credit-state', 'other']), { balance: 99 });
    unsubscribe(); client.clear();
  });
  it('cancels an older Free-state read before writing the redeemed plan', async () => {
    const client = new QueryClient();
    let finish: ((value: CreditState) => void) | undefined;
    const oldRead = client.fetchQuery({ queryKey: ['credit-state', 'recipient'], queryFn: () => new Promise<CreditState>(resolve => { finish = resolve; }) }).catch(() => null);
    await applyPromoSnapshot(client, 'recipient', pro);
    finish?.({ ...pro, balance: 35, plan: { ...pro.plan, id: 'free' } });
    await oldRead;
    assert.equal(client.getQueryData<CreditState>(['credit-state', 'recipient'])?.plan.id, 'pro');
    assert.equal(client.getQueryData<CreditState>(['credit-state', 'recipient'])?.balance, 40);
    client.clear();
  });
  it('updates API credit without changing or renewing the current plan', async () => {
    const client = new QueryClient();
    const credited = { ...pro, balance: 75 };
    await applyPromoSnapshot(client, 'recipient', credited);
    const state = client.getQueryData<CreditState>(['credit-state', 'recipient']);
    assert.equal(state?.balance, 75);
    assert.equal(state?.plan.id, 'pro');
    assert.equal(state?.nextBillingDate, pro.nextBillingDate);
    client.clear();
  });
  it('updates independent plan-label observers along with the wallet observer', async () => {
    const client = new QueryClient();
    const key = ['credit-state', 'recipient'];
    client.setQueryData(key, { ...pro, plan: { ...pro.plan, id: 'free' } });
    const label = new QueryObserver(client, { queryKey: key, enabled: false, select: (state: CreditState) => state.plan.id });
    let currentPlan: string | undefined;
    const unsubscribe = label.subscribe(result => { currentPlan = result.data; });
    await applyPromoSnapshot(client, 'recipient', pro);
    assert.equal(currentPlan, 'pro');
    unsubscribe(); client.clear();
  });
  for (const kind of ['plan', 'credit']) {
    it(`triggers one confirmation only after a successful ${kind} redemption`, async () => {
      let sent = 0;
      const result = await completePromoActivation({ ok: true, kind }, { snapshot: async () => pro, notify: () => { sent++; }, onError: () => { throw new Error('unexpected'); } });
      assert.equal(sent, 1);
      assert.equal(result.creditState?.plan.id, 'pro');
    });
  }
  it('does not send a confirmation for a rejected or reused code', async () => {
    let effects = 0;
    const result = await completePromoActivation({ ok: false, error: 'Already used' }, { snapshot: async () => { effects++; return pro; }, notify: () => { effects++; }, onError: () => { effects++; } });
    assert.equal(effects, 0);
    assert.equal(result.ok, false);
  });
  it('preserves successful redemption and sends confirmation even when the follow-up read fails', async () => {
    let sent = 0;
    let errors = 0;
    const result = await completePromoActivation({ ok: true }, { snapshot: async () => { throw new Error('read unavailable'); }, notify: () => { sent++; }, onError: () => { errors++; } });
    assert.equal(result.ok, true);
    assert.equal(result.creditState, null);
    assert.equal(sent, 1);
    assert.equal(errors, 1);
  });
});