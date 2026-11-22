import { ARTICLE_SEEDS, chooseKeyword, parseKeywordRows, type KeywordCandidate } from './daily-article';

export class ArticleProviderError extends Error {
  constructor(message: string, readonly status: number) { super(message); }
}
export type ArticleResearch = { keyword: KeywordCandidate; database: string; researchedAt: string; sources: { title: string; url: string; markdown: string }[]; prospects: { title: string; url: string }[]; coverUrl?: string };

async function gateway(service: string, path: string, keyName: string, init?: RequestInit) {
  const key = process.env[keyName];
  const lovable = process.env['LOVABLE_API_KEY'];
  if (!key || !lovable) throw new ArticleProviderError(`${service} is not connected.`, 401);
  const response = await fetch(`https://connector-gateway.lovable.dev/${service}${path}`, {
    ...init, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${lovable}`, 'X-Connection-Api-Key': key },
  });
  if (!response.ok) {
    const body = await response.text();
    console.error(`[article-${service}] ${response.status}: ${body}`);
    throw new ArticleProviderError(`${service} [${response.status}]: ${body.slice(0, 500)}`, response.status);
  }
  const body = await response.json() as {status?: number; error?: string; success?: boolean; data?: unknown};
  if (body.error || body.success === false || (body.status && body.status >= 400)) throw new ArticleProviderError(`${service}: ${body.error ?? 'Research failed'}`, body.status ?? 502);
  return body;
}

export async function researchArticle(day: string, used: string[]): Promise<ArticleResearch> {
  let keyword: KeywordCandidate | null = null;
  const start = Math.floor(Date.parse(day) / 86400000) % ARTICLE_SEEDS.length;
  // At most five research reports; an empty seed is not a provider failure.
  for (let offset = 0; offset < ARTICLE_SEEDS.length && !keyword; offset++) {
    const seed = ARTICLE_SEEDS[(start + offset) % ARTICLE_SEEDS.length] ?? ARTICLE_SEEDS[0];
    const params = new URLSearchParams({phrase: seed, database:'us', export_columns:'Ph,Nq,Kd', display_limit:'10'});
    const report = await gateway('semrush', `/keywords/phrase_related?${params}`, 'SEMRUSH_API_KEY');
    const table = report.data as {columnNames: string[]; rows: unknown[][]} | undefined;
    if (!table || !Array.isArray(table.rows)) throw new ArticleProviderError('Semrush returned no keyword report.', 422);
    keyword = chooseKeyword(parseKeywordRows(table), used);
  }
  if (!keyword) throw new ArticleProviderError('No unused keyword with known demand and difficulty was found.', 422);
  const search = await gateway('firecrawl', '/v2/search', 'FIRECRAWL_API_KEY', {
    method:'POST', body:JSON.stringify({query: `${keyword.keyword} financial markets forex`, limit: 5, scrapeOptions: { formats:['markdown'] }}),
  });
  const data = search.data as {web?: {url?: string; title?: string; markdown?: string}[]} | undefined;
  const sources = (data?.web ?? []).flatMap(item => {
    if (!item.url?.startsWith('https://') || !item.markdown || item.markdown.length < 300) return [];
    return [{title:item.title ?? item.url, url:item.url, markdown:item.markdown.slice(0, 14000)}];
  });
  if (sources.length < 2) throw new ArticleProviderError('Insufficient source material; automatic publishing stopped.', 422);
  return { keyword, database:'us', researchedAt:new Date().toISOString(), sources,
    prospects:sources.map(({title,url}) => ({title,url})) };
}