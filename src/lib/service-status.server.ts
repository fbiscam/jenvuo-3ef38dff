import { createClient } from '@supabase/supabase-js';
import { candleFeedState, emailDnsState, goldQuoteState, keyAuthState, type ServiceCheck, type ServiceId, type StatusSample } from './service-status';

const PROBES: { id: ServiceId; url: string }[] = [
  { id: 'website', url: 'https://jenvu.com/' },
  { id: 'dashboard', url: 'https://dash.jenvu.com/overview' },
  { id: 'auth', url: 'https://auth.jenvu.com/sign-in' },
  { id: 'docs', url: 'https://jenvu.com/docs' },
  { id: 'api', url: 'https://jenvu.com/api/public/v1/models' },
  { id: 'licensing', url: 'https://jenvu.com/api/public/licenses/validate' },
  { id: 'gold', url: 'https://api.gold-api.com/price/XAU' },
  { id: 'keys', url: 'https://jenvu.com/api/public/v1/chat/completions' },
  { id: 'terminal', url: 'https://dash.jenvu.com/terminal' },
  { id: 'chat', url: 'https://dash.jenvu.com/chat' },
  { id: 'payments', url: 'https://dash.jenvu.com/billing' },
  { id: 'candles', url: 'https://api.gateio.ws/api/v4/futures/usdt/candlesticks?contract=XAU_USDT&interval=1m&limit=1' },
  { id: 'reports', url: 'https://jenvu.com/api/public/licenses/report' },
  { id: 'keys_console', url: 'https://dash.jenvu.com/api' },
  { id: 'payment_page', url: 'https://dash.jenvu.com/payment' },
  { id: 'email_dns', url: 'https://cloudflare-dns.com/dns-query?name=notify.jenvu.com&type=NS' },
];
const JSON_PROBES = new Set<ServiceId>(['gold', 'api', 'licensing', 'reports', 'candles', 'email_dns']);
let cache: { expires: number; value: Awaited<ReturnType<typeof collectStatus>> } | undefined;
let pending: Promise<Awaited<ReturnType<typeof collectStatus>>> | undefined;

async function probe({ id, url }: typeof PROBES[number]): Promise<ServiceCheck> {
  try {
    if (id === 'keys') {
      // Keyless request: rejected before any account lookup, usage or model call.
      const response = await fetch(url, { method: 'POST', body: '{}', signal: AbortSignal.timeout(8000), headers: { 'Content-Type': 'application/json' } });
      return { id, state: keyAuthState(response.status, await response.json().catch(() => null)) };
    }
    const response = await fetch(url, { signal: AbortSignal.timeout(8000), headers: { Accept: id === 'email_dns' ? 'application/dns-json' : JSON_PROBES.has(id) ? 'application/json' : 'text/html' },
      ...(id === 'licensing' || id === 'reports' ? { method: 'POST', body: '{', headers: { 'Content-Type': 'application/json' } } : {}) });
    if (id === 'email_dns') return { id, state: response.ok ? emailDnsState(await response.json().catch(() => null)) : 'unknown' };
    if (!response.ok) return { id, state: id === 'candles' ? 'unknown' : 'unavailable' };
    if (JSON_PROBES.has(id)) {
      const body = await response.json();
      if (id === 'gold') return { id, state: goldQuoteState(body.price, body.updatedAt, Date.now()) };
      if (id === 'candles') { const last = Array.isArray(body) ? body[body.length - 1] : null; return { id, state: candleFeedState(last?.t, last?.c, Date.now()) }; }
      if (id === 'api' && !(body.object === 'list' && Array.isArray(body.data) && body.data.length > 0)) return { id, state: 'degraded' };
      if ((id === 'licensing' || id === 'reports') && !(body.valid === false && body.reason === 'malformed')) return { id, state: 'degraded' };
    } else {
      const html = await response.text();
      if (!html.includes('Jenvu') || /<h1[^>]*>[^<]*(Page not found|This page didn.t load)/i.test(html)) return { id, state: 'degraded' };
    }
    return { id, state: 'operational' };
  } catch { return { id, state: 'unknown' }; }
}
function publicClient(url: string, key: string) {
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false }, global: {
    fetch: (input, init) => {
      const headers = new Headers(init?.headers);
      if (key.startsWith('sb_')) headers.delete('Authorization');
      headers.set('apikey', key);
      return fetch(input, { ...init, headers, signal: AbortSignal.timeout(8000) });
    },
  } });
}
async function collectStatus(url: string | undefined, key: string | undefined) {
  const client = url && key ? publicClient(url, key) : undefined;
  const emailPromise = (async (): Promise<ServiceCheck> => {
    if (!client) return { id: 'email_delivery', state: 'unknown' };
    try {
      const { data, error } = await client.rpc('email_delivery_state');
      const state = typeof data === 'string' && ['operational', 'degraded', 'unavailable', 'unknown'].includes(data) ? data as ServiceCheck['state'] : 'unknown';
      return { id: 'email_delivery', state: error ? 'unknown' : state };
    } catch { return { id: 'email_delivery', state: 'unknown' }; }
  })();
  const historyPromise = (async (): Promise<{ samples: StatusSample[]; historyAvailable: boolean }> => {
    if (!client) return { samples: [], historyAvailable: false };
    try {
      const { data, error } = await client.rpc('service_status_daily_history');
      if (error) return { samples: [], historyAvailable: false };
      return { samples: (data ?? []) as StatusSample[], historyAvailable: true };
    } catch { return { samples: [], historyAvailable: false }; }
  })();
  const [probed, email, history] = await Promise.all([Promise.all(PROBES.map(probe)), emailPromise, historyPromise]);
  return { checks: [...probed, email], ...history, checkedAt: new Date().toISOString() };
}
export async function readServiceStatus(url: string | undefined, key: string | undefined) {
  if (cache && cache.expires > Date.now()) return cache.value;
  if (pending) return pending;
  pending = collectStatus(url, key);
  try { const value = await pending; cache = { value, expires: Date.now() + 60_000 }; return value; }
  finally { pending = undefined; }
}