export type ServiceState = 'operational' | 'degraded' | 'unavailable' | 'unknown';
export type ServiceId = 'website' | 'dashboard' | 'auth' | 'docs' | 'api' | 'licensing' | 'gold' | 'keys' | 'terminal' | 'chat' | 'payments'
  | 'candles' | 'reports' | 'keys_console' | 'payment_page' | 'email_delivery' | 'email_dns';
export type StatusSample = { service: string; checked_at: string; state: ServiceState };
export type ServiceCheck = { id: ServiceId; state: ServiceState };
/** Every group lists at least two independently checked services (tested). */
export const STATUS_GROUPS: { name: string; services: { id: ServiceId; name: string }[] }[] = [
  { name: 'Jenvu Platform', services: [{ id: 'website', name: 'Website' }, { id: 'dashboard', name: 'Dashboard access' }, { id: 'auth', name: 'Sign-in access' }] },
  { name: 'Developer API', services: [{ id: 'api', name: 'Model catalog' }, { id: 'docs', name: 'Documentation' }] },
  { name: 'Terminal & Market Data', services: [{ id: 'gold', name: 'Gold quote feed' }, { id: 'candles', name: 'Gold candle stream' }] },
  { name: 'API Keys', services: [{ id: 'keys', name: 'API key authentication' }, { id: 'keys_console', name: 'API key management' }] },
  { name: 'Workspace', services: [{ id: 'terminal', name: 'Web Terminal' }, { id: 'chat', name: 'AI Chat & script studio' }] },
  { name: 'Billing & Payments', services: [{ id: 'payments', name: 'Billing & checkout' }, { id: 'payment_page', name: 'Payment submission' }] },
  { name: 'Email & Notifications', services: [{ id: 'email_delivery', name: 'Email delivery' }, { id: 'email_dns', name: 'Email sending domain' }] },
];
/** Latest candle must be recent; stale on a weekday is degraded, weekend closure stays unverified. `lastOpenSec` is the candle open time in seconds. */
export function candleFeedState(lastOpenSec: unknown, close: unknown, now: number): ServiceState {
  const t = Number(lastOpenSec) * 1000, c = Number(close);
  if (!Number.isFinite(t) || !Number.isFinite(c) || c <= 0 || t > now + 60_000) return 'unknown';
  if (now - t <= 300_000) return 'operational';
  const day = new Date(now).getUTCDay();
  return day === 0 || day === 6 ? 'unknown' : 'degraded';
}
/** Sending domain is healthy only while its nameservers resolve (DNS-over-HTTPS JSON answer). */
export function emailDnsState(body: unknown): ServiceState {
  const b = body as { Status?: unknown; Answer?: { type?: unknown; data?: unknown }[] } | null;
  if (!b || typeof b.Status !== 'number') return 'unknown';
  if (b.Status === 3) return 'unavailable';
  if (b.Status !== 0) return 'degraded';
  const ns = (b.Answer ?? []).filter(a => a.type === 2 && typeof a.data === 'string');
  return ns.length ? 'operational' : 'unavailable';
}
/** Delivery from recent send outcomes (newest first): latest failed = unavailable, any failure in the last 24h = degraded, none sent = unknown. */
export function emailDeliveryState(outcomes: { status: string; at: string }[], now: number): ServiceState {
  const failed = (s: string) => s === 'failed' || s === 'dlq';
  const latest = outcomes.find(o => o.status === 'sent' || failed(o.status));
  if (!latest) return 'unknown';
  if (failed(latest.status)) return 'unavailable';
  return outcomes.some(o => failed(o.status) && now - Date.parse(o.at) <= 86400_000) ? 'degraded' : 'operational';
}
/** The keyless completions request must be rejected with the public auth error, proving key checks run. */
export function keyAuthState(status: number, body: unknown): ServiceState {
  const error = (body as { error?: { type?: unknown } } | null)?.error;
  if (status === 401 && error?.type === 'invalid_request_error') return 'operational';
  return status >= 500 ? 'unavailable' : 'degraded';
}
export const STATE_LABEL: Record<ServiceState, string> = { operational: 'Operational', degraded: 'Degraded', unavailable: 'Unavailable', unknown: 'Not verified' };
export function aggregateState(states: ServiceState[]): ServiceState {
  if (states.includes('unavailable')) return 'unavailable';
  if (states.includes('degraded')) return 'degraded';
  if (!states.length || states.includes('unknown')) return 'unknown';
  return 'operational';
}
export function goldQuoteState(price: unknown, timestamp: unknown, now: number): ServiceState {
  const time = typeof timestamp === 'string' ? Date.parse(timestamp) : NaN;
  if (typeof price !== 'number' || !Number.isFinite(price) || price <= 0 || !Number.isFinite(time) || time > now + 60_000) return 'unknown';
  if (now - time <= 120_000) return 'operational';
  const day = new Date(now).getUTCDay();
  return day === 0 || day === 6 ? 'unknown' : 'degraded';
}
/** UTC days with only genuine observations; missing dates stay unknown. */
export function statusDays(samples: StatusSample[], ids: string[], now: string) {
  const today = new Date(now); today.setUTCHours(0, 0, 0, 0);
  return Array.from({ length: 90 }, (_, i) => {
    const date = new Date(today.getTime() - (89 - i) * 86400_000).toISOString().slice(0, 10);
    const rows = samples.filter(s => ids.includes(s.service) && s.checked_at.slice(0, 10) === date);
    const complete = ids.every(id => rows.some(s => s.service === id));
    const state = aggregateState(complete ? rows.map(s => s.state) : [...rows.map(s => s.state), 'unknown']);
    return { date, state, count: rows.length };
  });
}