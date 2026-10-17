import { useCallback, useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Info } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useAuthUser } from "@/hooks/useAuthUser";
import { markNotificationRead } from "@/lib/notifications.functions";

type Notice = { id: string; title: string; body: string | null };

/**
 * Google Cloud console-style notice strip: shows the newest unread
 * notification at the top of the dashboard with Dismiss / View actions.
 */
export default function NotificationStrip() {
  const { user } = useAuthUser();
  const markRead = useServerFn(markNotificationRead);
  const [notice, setNotice] = useState<Notice | null>(null);

  const load = useCallback(async () => {
    if (!user) {
      setNotice(null);
      return;
    }
    const { data } = await supabase
      .from("user_notifications")
      .select("id,title,body")
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

  if (!notice) return null;

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

  return (
    <div className="mx-4 mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl bg-gc-notice px-5 py-3 sm:mx-6">
      <Info className="h-[18px] w-[18px] shrink-0 fill-gc-blue-deep text-gc-notice" aria-hidden="true" />
      <p className="min-w-0 flex-1 text-[14px] text-gc-ink">
        <span className="font-medium">{notice.title}</span>
        {notice.body ? <span className="text-gc-ink-muted"> — {notice.body}</span> : null}
      </p>
      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={() => void dismiss()}
          className="h-8 rounded-full px-3 text-[13px] font-medium text-gc-blue-deep hover:bg-gc-blue-soft"
        >
          Dismiss
        </button>
        <Link
          to="/dashboard/notifications"
          className="inline-flex h-8 items-center rounded-full border border-gc-ink-muted/60 bg-background px-4 text-[13px] font-medium text-gc-ink hover:bg-gc-surface"
        >
          View all
        </Link>
      </div>
    </div>
  );
}
