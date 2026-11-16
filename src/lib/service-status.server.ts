import { createClient } from '@supabase/supabase-js';
import { goldQuoteState, type ServiceCheck, type ServiceId, type StatusSample } from './service-status';

const PROBES: { id: ServiceId; url: string }[] = [
  { id: 'website', url: 'https://jenvu.com/' },
  { id: 'dashboard', url: 'https://dash.jenvu.com/overview' },
  { id: 'auth', url: 'https://auth.jenvu.com/sign-in' },
  { id: 'docs', url: 'https://jenvu.com/docs' },
  { id: 'api', url: 'https://jenvu.com/api/public/v1/models' },
  { id: 'licensing', url: 'https://jenvu.com/api/public/licenses/validate' },
  { id: 'gold', url: 'https://api.gold-api.com/price/XAU' },
];
let cache: { expires: number; value: Awaited<ReturnType<typeof collectStatus>> } | undefined;
let pending: Promise<Awaited<ReturnType<typeof collectStatus>>> | undefined;

async function probe({ id, url }: typeof PROBES[number]): Promise<ServiceCheck> {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(8000), headers: { Accept: id === 'gold' || id === 'api' || id === 'licensing' ? 'application/json' : 'text/html' },
      ...(id === 'licensing' ? { method: 'POST', body: '{', headers: { 'Content-Type': 'application/json' } } : {}) });
    if (!response.ok) return { id, state: 'unavailable' };
    if (id === 'gold' || id === 'api' || id === 'licensing') {
      const body = await response.json();
      if (id === 'gold') return { id, state: goldQuoteState(body.price, body.updatedAt, Date.now()) };
      if (id === 'api' && !(body.object === 'list' && Array.isArray(body.data) && body.data.length > 0)) return { id, state: 'degraded' };
      if (id === 'licensing' && !(body.valid === false && body.reason === 'malformed')) return { id, state: 'degraded' };
    } else {
      const html = await response.text();
      if (!html.includes('Jenvu') || /<h1[^>]*>[^<]*(Page not found|This page didn.t load)/i.test(html)) return { id, state: 'degraded' };
    }
    return { id, state: 'operational' };
  } catch { return { id, state: 'unknown' }; }
}
async function collectStatus(url: string | undefined, key: string | undefined) {
  const historyPromise = (async (): Promise<{ samples: StatusSample[]; historyAvailable: boolean }> => {
    if (!url || !key) return { samples: [], historyAvailable: false };
    try {
      const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false }, global: {
        fetch: (input, init) => {
          const headers = new Headers(init?.headers);
          if (key.startsWith('sb_')) headers.delete('Authorization');
          headers.set('apikey', key);
          return fetch(input, { ...init, headers, signal: AbortSignal.timeout(8000) });
        },
      } });
      const { data, error } = await client.rpc('service_status_daily_history');
      if (error) return { samples: [], historyAvailable: false };
      return { samples: (data ?? []) as StatusSample[], historyAvailable: true };
    } catch { return { samples: [], historyAvailable: false }; }
  })();
  const [checks, history] = await Promise.all([Promise.all(PROBES.map(probe)), historyPromise]);
  return { checks, ...history, checkedAt: new Date().toISOString() };
}
export async function readServiceStatus(url: string | undefined, key: string | undefined) {
  if (cache && cache.expires > Date.now()) return cache.value;
  if (pending) return pending;
  pending = collectStatus(url, key);
  try { const value = await pending; cache = { value, expires: Date.now() + 60_000 }; return value; }
  finally { pending = undefined; }
}