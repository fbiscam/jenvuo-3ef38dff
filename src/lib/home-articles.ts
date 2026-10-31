import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const HOME_ARTICLE_COUNT = 5;
export const HOME_TITLE_MAX_WORDS = 6;

/** Cuts a title to at most `max` words, adding "…" when shortened. */
export function shortTitle(title: string, max = HOME_TITLE_MAX_WORDS): string {
  const words = title.trim().split(/\s+/).filter(Boolean);
  if (words.length <= max) return words.join(" ");
  return `${words.slice(0, max).join(" ").replace(/[,:;.\-–—]+$/, "")}…`;
}

export type HomeArticle = {
  id: string;
  title: string;
  slug: string;
  category: string | null;
  image_url: string | null;
};

export const homeArticlesQueryOptions = queryOptions({
  queryKey: ["home-articles", HOME_ARTICLE_COUNT],
  queryFn: async (): Promise<HomeArticle[]> => {
    const { data, error } = await supabase
      .from("insights")
      .select("id, title, slug, category, image_url")
      .order("published_at", { ascending: false })
      .limit(HOME_ARTICLE_COUNT);
    if (error) throw error;
    return (data ?? []) as HomeArticle[];
  },
  staleTime: 5 * 60_000,
});
