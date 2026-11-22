import { createFileRoute } from "@tanstack/react-router";

export async function submitToGoogle(url?: string) {
  const helper = await import('@/lib/article-indexing.server');
  return helper.submitToGoogle(url);
}
export async function submitToIndexNow(urls: string[]) {
  const helper = await import('@/lib/article-indexing.server');
  return helper.submitToIndexNow(urls);
}

export const Route = createFileRoute("/api/public/hooks/generate-insight")({
  server: { handlers: { POST: async ({ request }) => {
    const { isAuthorizedCronRequest, cronUnauthorized } = await import('@/lib/cron-guard.server');
    if (!(await isAuthorizedCronRequest(request))) return cronUnauthorized();
    const { runDailyArticle } = await import('@/lib/daily-article.server');
    const result = await runDailyArticle({ google: submitToGoogle, indexnow: submitToIndexNow });
    return Response.json(result, {status: 'status' in result && result.status && result.status >= 400 ? result.status : 200});
  } } },
});
