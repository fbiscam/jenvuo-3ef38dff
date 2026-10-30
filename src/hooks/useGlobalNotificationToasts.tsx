import { useEffect } from "react";
import { toast } from "sonner";
import { Bell, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { playAlertSound } from "@/lib/alert-sound";

function beep() {
  playAlertSound();
}

/**
 * Subscribes to the current user's `user_notifications` table via realtime and
 * fires an in-app toast + sound the moment a new notification is inserted —
 * anywhere inside the authenticated app.
 *
 * Uses `toast.custom` (not the default `action` prop) so the "View alert"
 * button renders INSIDE the notification card in a stacked layout. The
 * default Sonner action button sits in a horizontal row and can visually
 * spill outside the card on narrow widths — this custom card keeps
 * everything contained.
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
            // Security alerts (e.g. suspicious sign-ins) stay in the bell list
            // only — never shown as a popup toast.
            if (n.type === "security") return;
            beep();
            const title = n.title || "New notification";
            const body = n.body || "";
            const isSignal = n.type === "signal_alert";
            const href = "/dashboard/notifications";
            const Icon = isSignal ? TrendingUp : Bell;
            const tile = isSignal ? "bg-gc-green-soft text-gc-success" : "bg-gc-blue-soft text-gc-blue-deep";

            toast.custom(
              (t) => (
                <div className="w-[360px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-gc-line bg-background shadow-lg">
                  <div className="flex items-start gap-3 p-4">
                    <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${tile}`}>
                      <Icon className="h-[18px] w-[18px]" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[13px] font-semibold text-gc-ink">
                        {title}
                      </div>
                      {body && (
                        <div className="mt-0.5 line-clamp-2 text-[12px] leading-snug text-gc-ink-muted">
                          {body}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-end gap-1 border-t border-gc-line bg-gc-surface px-2 py-1.5">
                    <button
                      type="button"
                      onClick={() => toast.dismiss(t)}
                      className="rounded-lg px-2.5 py-1 text-[12px] font-medium text-gc-ink-muted transition hover:bg-gc-panel hover:text-gc-ink"
                    >
                      Dismiss
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        toast.dismiss(t);
                        window.location.href = href;
                      }}
                      className="rounded-full bg-gc-blue-deep px-3 py-1 text-[12px] font-medium text-gc-on-blue transition hover:bg-gc-navy"
                    >
                      {isSignal ? "View alert" : "View"}
                    </button>
                  </div>
                </div>
              ),
              { duration: 6000 },
            );
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
