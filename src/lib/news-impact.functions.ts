import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Release } from "./news-impact";

export type UpcomingRelease = Release & { title: string };

/** News Impact page data: tracked releases with measured reactions + upcoming high-impact US events. */
export const getNewsImpact = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    let pending = 0;
    let feedError = false;
    try {
      // Shared market data (not user data): the server keeps the store filled.
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { syncCalendar, measurePending } = await import("./news-impact.server");
      await syncCalendar(supabaseAdmin);
      pending = await measurePending(supabaseAdmin);
    } catch {
      feedError = true;
    }
    const since = new Date(Date.now() - 40 * 31 * 86400000).toISOString();
    const { data: releases } = await (await import("@/integrations/supabase/client.server")).supabaseAdmin
      .from("news_releases")
      .select("id,event_key,title,released_at,actual,forecast,previous,unit,scale,reactions")
      .neq("event_key", "other")
      .gte("released_at", since)
      .order("released_at", { ascending: false })
      .limit(1000);
    const nowIso = new Date(Date.now() - 2 * 3600_000).toISOString();
    const { data: upcoming } = await (await import("@/integrations/supabase/client.server")).supabaseAdmin
      .from("news_releases")
      .select("id,event_key,title,released_at,actual,forecast,previous,unit,scale")
      .gte("released_at", nowIso)
      .lte("released_at", new Date(Date.now() + 8 * 86400000).toISOString())
      .order("released_at", { ascending: true })
      .limit(40);
    return {
      releases: (releases ?? []) as unknown as UpcomingRelease[],
      upcoming: (upcoming ?? []) as unknown as UpcomingRelease[],
      pending,
      feedError,
      at: new Date().toISOString(),
    };
  });
