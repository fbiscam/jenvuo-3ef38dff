export const DAILY_ARTICLE_CAP = 1;
export const DAILY_ARTICLE_SCHEDULE = '0 9 * * *';
export const ARTICLE_SEEDS = ['gold trading strategy', 'ICT trading strategy', 'smart money concepts', 'MetaTrader 5 expert advisor', 'EURUSD trading strategy'] as const;

export type KeywordCandidate = { keyword: string; volume: number | null; difficulty: number | null };
export function parseKeywordRows(data: { columnNames: string[]; rows: unknown[][] }): KeywordCandidate[] {
  const keywordIndex = data.columnNames.indexOf('Keyword');
  const volumeIndex = data.columnNames.indexOf('Search Volume');
  const difficultyIndex = data.columnNames.indexOf('Keyword Difficulty Index');
  const number = (value: unknown) => value === null || value === undefined || value === '' || !Number.isFinite(Number(value)) ? null : Number(value);
  return data.rows.flatMap(row => {
    const keyword = row[keywordIndex];
    return typeof keyword === 'string' && keyword.trim() ? [{ keyword: keyword.trim(), volume: number(row[volumeIndex]), difficulty: number(row[difficultyIndex]) }] : [];
  });
}
export function chooseKeyword(candidates: KeywordCandidate[], used: string[]): KeywordCandidate | null {
  const seen = new Set(used.map(value => value.toLowerCase()));
  return candidates.filter(item => /\b(?:trade|trading|forex|xauusd|eurusd|mt5|metatrader|ict|smc)\b|smart money/i.test(item.keyword) && !seen.has(item.keyword.toLowerCase()) && item.volume !== null && item.volume > 0 && item.difficulty !== null)
    .sort((a, b) => ((b.volume ?? 0) / (1 + (b.difficulty ?? 100)) ** 2) - ((a.volume ?? 0) / (1 + (a.difficulty ?? 100)) ** 2))[0] ?? null;
}
export function articleDay(now: Date): string { return now.toISOString().slice(0, 10); }
export function dailyCapReached(count: number): boolean { return count >= DAILY_ARTICLE_CAP; }
export function articleQuality(markdown: string, keyword: string, sourceUrls: string[]): string[] {
  const errors: string[] = [];
  const title = /^# (.+)$/m.exec(markdown)?.[1] ?? '';
  if (!title || title.length > 60) errors.push('Title must contain 1–60 characters.');
  if (markdown.split(/\s+/).filter(Boolean).length < 900) errors.push('Article requires at least 900 words.');
  if (!title.toLowerCase().includes(keyword.toLowerCase())) errors.push('Primary keyword is missing from the title.');
  if (!markdown.replace(/^# .+\n/, '').split(/\s+/).slice(0, 100).join(' ').toLowerCase().includes(keyword.toLowerCase())) errors.push('Primary keyword is missing from the introduction.');
  if ((markdown.match(/^## /gm) ?? []).length < 4) errors.push('Article needs at least four substantive sections.');
  if (!/^## .*sources/im.test(markdown)) errors.push('Sources section is required.');
  if (sourceUrls.filter(url => markdown.includes(`](${url})`)).length < 2) errors.push('At least two researched sources must be cited.');
  if (!/\]\(https:\/\/(?:jenvu\.com|blogs\.jenvu\.com|support\.jenvu\.com)\//.test(markdown)) errors.push('A relevant internal link is required.');
  if (/guaranteed (?:profit|returns)|risk[- ]free trading|centralized gold order flow/i.test(markdown)) errors.push('Unsupported trading claim detected.');
  return errors;
}
export function matchingProperties(entries: { siteUrl: string; permissionLevel?: string }[], target: string): string[] {
  const url = new URL(target);
  return entries.filter(entry => {
    if (entry.permissionLevel === 'siteUnverifiedUser') return false;
    if (entry.siteUrl.startsWith('sc-domain:')) {
      const domain = entry.siteUrl.slice(10).toLowerCase();
      return url.hostname === domain || url.hostname.endsWith(`.${domain}`);
    }
    return target.startsWith(entry.siteUrl);
  }).map(entry => entry.siteUrl);
}