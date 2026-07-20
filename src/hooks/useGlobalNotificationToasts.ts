import { useEffect } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { playAlertSound } from "@/lib/alert-sound";

function beep() {
  playAlertSound();
}



/**
 * Subscribes to the current user's `user_notifications` table via realtime and
 * fires an in-app toast + sound the moment a new notification is inserted —
 * anywhere inside the authenticated app. This makes sure alerts show up live
 * without needing a page refresh.
 */
export function useGlobalNotificationToasts() {
  useEffect(() => {
    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let mountedAt = Date.now();

    (async () => {
      const { data } = await supabase.auth.getUser();
      const uid = data.user?.id;
      if (!uid || cancelled) return;

      channel = supabase
        .channel(`global-notifs:${uid}:${Math.random().toString(36).slice(2)}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "user_notifications",
            filter: `user_id=eq.${uid}`,
          },
          (payload) => {
            const n = payload.new as {
              title?: string | null;
              body?: string | null;
              type?: string | null;
              created_at?: string | null;
            };
            // Skip notifications that pre-date the tab (e.g. backfills).
            if (n.created_at) {
              const ts = new Date(n.created_at).getTime();
              if (ts < mountedAt - 5_000) return;
            }
            beep();
            const title = n.title || "New notification";
            const body = n.body || undefined;
            const isSignal = n.type === "signal_alert";
            toast(title, {
              description: body,
              duration: 6000,
              action: {
                label: isSignal ? "View alert" : "View",
                onClick: () => {
                  window.location.href = isSignal
                    ? "/dashboard/alerts"
                    : "/dashboard/notifications";
                },
              },
            });
          },
        )
        .subscribe();
      // Reset mountedAt after first subscription confirmation so we don't
      // miss the very first live insert.
      mountedAt = Date.now();
    })();

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, []);
}
