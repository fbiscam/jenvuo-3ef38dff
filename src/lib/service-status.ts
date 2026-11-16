export type ServiceState = 'operational' | 'degraded' | 'unavailable' | 'unknown';
export type ServiceId = 'website' | 'dashboard' | 'auth' | 'docs' | 'api' | 'licensing' | 'gold';
export type StatusSample = { service: string; checked_at: string; state: ServiceState };
export type ServiceCheck = { id: ServiceId; state: ServiceState };
export const STATUS_GROUPS: { name: string; services: { id: ServiceId; name: string }[] }[] = [
  { name: 'Jenvu Platform', services: [{ id: 'website', name: 'Website' }, { id: 'dashboard', name: 'Dashboard access' }, { id: 'auth', name: 'Sign-in access' }] },
  { name: 'Developer API', services: [{ id: 'api', name: 'Model catalog' }, { id: 'docs', name: 'Documentation' }] },
  { name: 'Terminal & Market Data', services: [{ id: 'gold', name: 'Gold quote feed' }] },
  { name: 'JX Bot', services: [{ id: 'licensing', name: 'MT5 license validator' }] },
];
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