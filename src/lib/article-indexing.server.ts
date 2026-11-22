const BASE_URL = "https://blogs.jenvu.com";
const INDEXNOW_KEY = "31f95befb924351f7ab6c1f5ce4bc15b";
const GSC_GATEWAY = "https://connector-gateway.lovable.dev/google_search_console";
const SITEMAP_URL = "https://blogs.jenvu.com/sitemap.xml";

/**
 * Ask Google to re-read the sitemap (which lists every blog article).
 * Google's per-URL Indexing API is not available through the connector, so
 * Submit only when a new article changes the blog sitemap; this is not an indexing guarantee.
 */
export async function submitToGoogle(_url?: string) {
  const lovableKey = process.env.LOVABLE_API_KEY;
  const gscKey = process.env.GOOGLE_SEARCH_CONSOLE_API_KEY;
  if (!lovableKey || !gscKey) return { ok: false, skipped: true };
  const headers = { Authorization: `Bearer ${lovableKey}`, "X-Connection-Api-Key": gscKey };
  try {
    const list = await fetch(`${GSC_GATEWAY}/webmasters/v3/sites`, { headers });
    if (!list.ok) return { ok: false, status: list.status, error: (await list.text()).slice(0, 300) };
    const { siteEntry = [] } = (await list.json()) as { siteEntry?: Array<{ siteUrl: string; permissionLevel?: string }> };
    const { matchingProperties } = await import('@/lib/daily-article');
    const matches = matchingProperties(siteEntry, BASE_URL + '/');
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const { data: job } = await supabaseAdmin.from('insight_generation_jobs').select('selected_site_url').eq('job_key', 'daily-insight').single();
    const siteUrl = job?.selected_site_url && matches.includes(job.selected_site_url) ? job.selected_site_url : matches.length === 1 ? matches[0] : undefined;
    if (!siteUrl) return { ok: false, error: matches.length ? 'selection-required' : 'no-verified-property', candidates: matches };
    const res = await fetch(
      `${GSC_GATEWAY}/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/sitemaps/${encodeURIComponent(SITEMAP_URL)}`,
      { method: "PUT", headers },
    );
    return { ok: res.ok, status: res.status, sitemap: SITEMAP_URL, property: siteUrl };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

export async function submitToIndexNow(urls: string[]) {
  if (!urls.length) return { ok: false, skipped: true };
  try {
    const res = await fetch("https://api.indexnow.org/IndexNow", {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({
        host: "blogs.jenvu.com",
        key: INDEXNOW_KEY,
        keyLocation: `${BASE_URL}/${INDEXNOW_KEY}.txt`,
        urlList: urls,
      }),
    });
    return { ok: res.ok, status: res.status };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

