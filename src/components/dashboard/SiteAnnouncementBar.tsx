import { useCallback, useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { AlertTriangle, Bot, Megaphone, Wrench } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthUser } from "@/hooks/useAuthUser";
import { BANNER_PRIORITY, useBannerSlot } from "@/lib/banner-slot";
import { pickAnnouncement, type Announcement } from "@/lib/announcements";

const ICONS = { update: Megaphone, bot: Bot, issue: AlertTriangle, maintenance: Wrench } as const;
const REFRESH_MS = 5 * 60 * 1000;

/**
 * Site-wide notice (new bot, updates, sign-up/Terminal/database issues) in the
 * same white strip as the 2FA reminder. Stays until the user dismisses it.
 */
export default function SiteAnnouncementBar() {
  const { user } = useAuthUser();
  const [notice, setNotice] = useState<Announcement | null>(null);
  const active = useBannerSlot("announcement", BANNER_PRIORITY.announcement, !!notice);

  const load = useCallback(async () => {
    if (!user) return setNotice(null);
    const [{ data: list }, { data: gone }] = await Promise.all([
      supabase
        .from("site_announcements")
        .select("id,kind,title,body,link_url,link_label,active,created_at")
        .eq("active", true)
        .order("created_at", { ascending: false })
        .limit(20),
      supabase.from("announcement_dismissals").select("announcement_id").eq("user_id", user.id),
    ]);
    setNotice(
      pickAnnouncement((list ?? []) as Announcement[], (gone ?? []).map((g) => g.announcement_id)),
    );
  }, [user]);

  useEffect(() => {
    void load();
    const t = window.setInterval(() => void load(), REFRESH_MS);
    return () => window.clearInterval(t);
  }, [load]);

  if (!notice || !active || !user) return null;

  const dismiss = async () => {
    const id = notice.id;
    setNotice(null);
    await supabase.from("announcement_dismissals").insert({ user_id: user.id, announcement_id: id });
    void load();
  };

  const Icon = ICONS[notice.kind] ?? Megaphone;
  const problem = notice.kind === "issue" || notice.kind === "maintenance";
  const href = notice.link_url?.trim() || null;
  const internal = !!href && href.startsWith("/");

  return (
    <section className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-gc-line bg-background py-2 pl-4 pr-4 sm:pl-5 md:pr-5">
      <Icon className={`h-5 w-5 shrink-0 ${problem ? "text-gc-amber" : "text-gc-ink-muted"}`} aria-hidden="true" />
      <p className="min-w-0 flex-1 text-[13px] text-gc-ink sm:text-[14px]">
        <span className="font-medium">{notice.title}</span>
        {notice.body ? <span className="text-gc-ink-muted"> — {notice.body}</span> : null}
      </p>
      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={() => void dismiss()}
          className="h-8 rounded-full border border-gc-line bg-background px-4 text-[13px] font-medium text-gc-ink hover:bg-gc-surface"
        >
          Dismiss
        </button>
        {href ? (
          internal ? (
            <Link
              to={href}
              className="inline-flex h-8 items-center rounded-full bg-gc-blue-deep px-4 text-[13px] font-medium text-gc-on-blue hover:bg-gc-navy"
            >
              {notice.link_label || "View"}
            </Link>
          ) : (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-8 items-center rounded-full bg-gc-blue-deep px-4 text-[13px] font-medium text-gc-on-blue hover:bg-gc-navy"
            >
              {notice.link_label || "View"}
            </a>
          )
        ) : null}
      </div>
    </section>
  );
}
