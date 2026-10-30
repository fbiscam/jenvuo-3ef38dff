import { useCallback, useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Bell, ShieldAlert } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useAuthUser } from "@/hooks/useAuthUser";
import { markNotificationRead } from "@/lib/notifications.functions";
import { BANNER_PRIORITY, useBannerSlot } from "@/lib/banner-slot";

type Notice = { id: string; title: string; body: string | null; type: string | null };

/**
 * Top-of-dashboard notice (same white strip as the 2FA reminder): shows the
 * newest unread notification. Only one dashboard notice shows at a time.
 */
export default function NotificationStrip() {
  const { user } = useAuthUser();
  const markRead = useServerFn(markNotificationRead);
  const [notice, setNotice] = useState<Notice | null>(null);
  const active = useBannerSlot("notice", BANNER_PRIORITY.notice, !!notice);

  const load = useCallback(async () => {
    if (!user) {
      setNotice(null);
      return;
    }
    const { data } = await supabase
      .from("user_notifications")
      .select("id,title,body,type")
      .eq("user_id", user.id)
      .is("read_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    setNotice((data as Notice | null) ?? null);
  }, [user]);

  useEffect(() => {
    if (!user) return;
    void load();
    const ch = supabase
      .channel(`notif-strip:${user.id}:${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "user_notifications", filter: `user_id=eq.${user.id}` },
        () => void load(),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(ch);
    };
  }, [user, load]);

  if (!notice || !active) return null;

  const dismiss = async () => {
    const id = notice.id;
    setNotice(null);
    try {
      await markRead({ data: { id } });
    } catch {
      /* ignore — strip reappears on next load if it failed */
    }
    void load();
  };

  const isSecurity = notice.type === "security" || notice.type === "device";
  const Icon = isSecurity ? ShieldAlert : Bell;

  return (
    <section className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-gc-line bg-background py-2 pl-4 pr-4 sm:pl-5 md:pr-5">
      <Icon className="h-5 w-5 shrink-0 text-gc-ink-muted" aria-hidden="true" />
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
        {isSecurity ? (
          <Link
            to="/dashboard/profile"
            hash="security"
            onClick={() => void dismiss()}
            className="inline-flex h-8 items-center rounded-full bg-gc-blue-deep px-4 text-[13px] font-medium text-gc-on-blue hover:bg-gc-navy"
          >
            Change password
          </Link>
        ) : (
          <Link
            to="/dashboard/notifications"
            className="inline-flex h-8 items-center rounded-full bg-gc-blue-deep px-4 text-[13px] font-medium text-gc-on-blue hover:bg-gc-navy"
          >
            View
          </Link>
        )}
      </div>
    </section>
  );
}
