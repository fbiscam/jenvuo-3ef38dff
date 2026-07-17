import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import {
  listNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
  type NotificationRow,
} from "@/lib/notifications.functions";
import { supabase } from "@/integrations/supabase/client";
import {
  Bell,
  TrendingUp,
  TrendingDown,
  Sparkles,
  Crown,
  Coins,
  ShieldCheck,
  Info,
  Trash2,
  CheckCheck,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/dashboard/notifications")({
  head: () => ({
    meta: [
      { title: "Notifications — Jenvu" },
      { name: "description", content: "All your Jenvu notifications in one place." },
    ],
  }),
  component: NotificationsPage,
});

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d`;
  return new Date(iso).toLocaleDateString();
}

function iconFor(n: NotificationRow) {
  const t = n.type;
  if (t === "signal_alert") {
    const dir = String(n.data?.direction ?? "").toUpperCase();
    if (dir === "BUY") return { Icon: TrendingUp, tone: "bg-emerald-50 text-emerald-600" };
    if (dir === "SELL") return { Icon: TrendingDown, tone: "bg-rose-50 text-rose-600" };
    return { Icon: Sparkles, tone: "bg-blue-50 text-blue-600" };
  }
  if (t === "plan_upgrade" || t === "founding_approved") return { Icon: Crown, tone: "bg-amber-50 text-amber-600" };
  if (t === "credit" || t === "topup" || t === "referral_reward")
    return { Icon: Coins, tone: "bg-emerald-50 text-emerald-600" };
  if (t === "security") return { Icon: ShieldCheck, tone: "bg-zinc-100 text-zinc-700" };
  return { Icon: Info, tone: "bg-zinc-100 text-zinc-600" };
}

function NotificationsPage() {
  const load = useServerFn(listNotifications);
  const markRead = useServerFn(markNotificationRead);
  const markAll = useServerFn(markAllNotificationsRead);
  const remove = useServerFn(deleteNotification);
  const [items, setItems] = useState<NotificationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"all" | "unread">("all");

  const refresh = async () => {
    const r = await load();
    setItems(r.items);
  };

  // Load + mark-all-read on entry (auto-read the page)
  useEffect(() => {
    let cancel = false;
    (async () => {
      setLoading(true);
      const r = await load();
      if (cancel) return;
      setItems(r.items);
      setLoading(false);
      if (r.unread > 0) {
        markAll().catch(() => {});
        // Reflect immediately in local state
        setItems((prev) => prev.map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() })));
      }
    })();
    return () => { cancel = true; };
  }, []);

  // Realtime updates
  useEffect(() => {
    let uid: string | null = null;
    (async () => {
      const { data } = await supabase.auth.getUser();
      uid = data.user?.id ?? null;
      if (!uid) return;
      const ch = supabase
        .channel(`notifs:${uid}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "user_notifications", filter: `user_id=eq.${uid}` },
          () => { refresh(); },
        )
        .subscribe();
      (window as any).__notifCh = ch;
    })();
    return () => {
      const ch = (window as any).__notifCh;
      if (ch) supabase.removeChannel(ch);
    };
  }, []);

  const visible = tab === "unread" ? items.filter((n) => !n.read_at) : items;

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6">
        <header className="mb-4">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Notifications</h1>
          <p className="mt-1 text-sm text-zinc-500">Signal alerts, plan updates, and account activity.</p>
        </header>

        <div className="mb-4 flex items-center justify-between border-b border-zinc-100">
          <div className="flex gap-1">
            {(["all", "unread"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={cn(
                  "-mb-px px-4 py-2 text-sm font-medium",
                  tab === t
                    ? "border-b-2 border-blue-600 text-zinc-900"
                    : "text-zinc-500 hover:text-zinc-800",
                )}
              >
                {t === "all" ? "All" : "Unread"}
              </button>
            ))}
          </div>
          {items.some((n) => !n.read_at) && (
            <button
              onClick={async () => {
                await markAll();
                setItems((prev) => prev.map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() })));
              }}
              className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium text-zinc-600 hover:bg-zinc-100"
            >
              <CheckCheck className="h-3.5 w-3.5" /> Mark all read
            </button>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-zinc-400">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : visible.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-zinc-200 p-12 text-center">
            <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-zinc-100 text-zinc-400">
              <Bell className="h-5 w-5" />
            </div>
            <div className="text-sm font-medium text-zinc-800">You're all caught up</div>
            <div className="mt-1 text-xs text-zinc-500">
              {tab === "unread" ? "No unread notifications." : "New notifications will appear here."}
            </div>
          </div>
        ) : (
          <div className="divide-y divide-zinc-100 overflow-hidden rounded-2xl border border-zinc-100">
            {visible.map((n) => {
              const { Icon, tone } = iconFor(n);
              const unread = !n.read_at;
              const url = typeof n.data?.url === "string" ? n.data.url : undefined;
              const body = (
                <div className={cn("flex gap-3 px-4 py-3 transition", unread ? "bg-blue-50/40" : "bg-white")}>
                  <div className={cn("mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full", tone)}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-zinc-900">{n.title}</div>
                        {n.body && (
                          <div className="mt-0.5 line-clamp-2 text-[13px] text-zinc-600">{n.body}</div>
                        )}
                      </div>
                      <span className="shrink-0 text-[11px] text-zinc-400">{timeAgo(n.created_at)}</span>
                    </div>
                  </div>
                  <button
                    onClick={async (e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      await remove({ data: { id: n.id } });
                      setItems((prev) => prev.filter((x) => x.id !== n.id));
                    }}
                    className="ml-1 self-start rounded-full p-1.5 text-zinc-300 opacity-0 transition group-hover:opacity-100 hover:bg-zinc-100 hover:text-zinc-700"
                    title="Delete"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
              return url ? (
                <Link
                  key={n.id}
                  to={url as "/dashboard"}
                  className="group block"
                  onClick={async () => {
                    if (unread) {
                      await markRead({ data: { id: n.id } });
                      setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, read_at: new Date().toISOString() } : x)));
                    }
                  }}
                >
                  {body}
                </Link>
              ) : (
                <div key={n.id} className="group">{body}</div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
