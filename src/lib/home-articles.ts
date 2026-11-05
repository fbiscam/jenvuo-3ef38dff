import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const HOME_ARTICLE_COUNT = 4;
export { shortTitle, HOME_TITLE_MAX_WORDS } from "./short-title";

export type HomeArticle = {
  id: string;
  title: string;
  slug: string;
  category: string | null;
  image_url: string | null;
  published_at: string;
};

/** The four articles written for the homepage "Latest news" row; always shown, in this order. */
export const HOME_ARTICLE_SLUGS = [
  "streaming-replies-with-the-jenvu-api",
  "build-a-gold-analysis-agent",
  "choosing-the-right-model-per-task",
  "handling-api-errors-and-rate-limits",
] as const;

export const homeArticlesQueryOptions = queryOptions({
  queryKey: ["home-articles", "pinned", ...HOME_ARTICLE_SLUGS],
  queryFn: async (): Promise<HomeArticle[]> => {
    const { data, error } = await supabase
      .from("insights")
      .select("id, title, slug, category, image_url, published_at")
      .in("slug", [...HOME_ARTICLE_SLUGS]);
    if (error) throw error;
    const rows = (data ?? []) as HomeArticle[];
    return HOME_ARTICLE_SLUGS.map((s) => rows.find((r) => r.slug === s)).filter(
      (r): r is HomeArticle => !!r,
    );
  },
  staleTime: 5 * 60_000,
});
