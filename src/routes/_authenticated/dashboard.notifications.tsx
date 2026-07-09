import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import {
  Bell,
  BellRing,
  Check,
  CheckCheck,
  Sparkles,
  Crown,
  Coins,
  Mail,
  ShieldCheck,
  TrendingUp,
  TrendingDown,
  Info,
  Inbox,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  listNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  type NotificationRow,
} from "@/lib/notifications.functions";

export const Route = createFileRoute("/_authenticated/dashboard/notifications")({
  head: () => ({
    meta: [
      { title: "Notifications — JENVU AI" },
      { name: "description", content: "All your JENVU notifications in one place." },
    ],
  }),
  component: NotificationsPage,
});

type Filter = "all" | "unread" | "signal_alert" | "welcome" | "plan_upgrade" | "credits" | "security" | "email";

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

function visualFor(n: NotificationRow) {
  const t = n.type;
  if (t === "signal_alert") {
    const isBuy = (n.data?.direction as string) === "BUY";
    const alertId = (n.data?.alert_id as string) || undefined;
    return {
      Icon: isBuy ? TrendingUp : TrendingDown,
      wrap: isBuy ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600",
      href: "/signal" as const,
      search: alertId ? { alertId } : undefined,
      label: "Signal alert",
    };
  }
  if (t === "welcome")
    return { Icon: Sparkles, wrap: "bg-violet-50 text-violet-600", href: "/dashboard" as const, label: "Welcome" };
  if (t === "plan_upgrade" || t === "plan-upgrade")
    return { Icon: Crown, wrap: "bg-amber-50 text-amber-600", href: "/dashboard/billing" as const, label: "Plan" };
  if (t === "credits_low" || t === "credits")
    return { Icon: Coins, wrap: "bg-orange-50 text-orange-600", href: "/dashboard/billing" as const, label: "Credits" };
  if (t === "email" || t === "message")
    return { Icon: Mail, wrap: "bg-sky-50 text-sky-600", href: "/dashboard" as const, label: "Message" };
  if (t === "security")
    return { Icon: ShieldCheck, wrap: "bg-emerald-50 text-emerald-600", href: "/dashboard/security" as const, label: "Security" };
  return { Icon: Info, wrap: "bg-zinc-100 text-zinc-600", href: "/dashboard" as const, label: "Update" };
}

function NotificationsPage() {
  const listFn = useServerFn(listNotifications);
  const markFn = useServerFn(markNotificationRead);
  const markAllFn = useServerFn(markAllNotificationsRead);

  const [items, setItems] = useState<NotificationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");

  const load = useCallback(async () => {
    try {
      const res = await listFn();
      setItems(res.items);
    } finally {
      setLoading(false);
    }
  }, [listFn]);

  useEffect(() => {
    load();
  }, [load]);

  // Realtime updates
  useEffect(() => {
    let uid: string | null = null;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    (async () => {
      const { data } = await supabase.auth.getUser();
      uid = data.user?.id ?? null;
      if (!uid) return;
      channel = supabase
        .channel(`notifications-page:${uid}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "user_notifications", filter: `user_id=eq.${uid}` },
          () => load(),
        )
        .subscribe();
    })();
    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [load]);

  const unreadCount = useMemo(() => items.filter((n) => !n.read_at).length, [items]);

  const filtered = useMemo(() => {
    if (filter === "all") return items;
    if (filter === "unread") return items.filter((n) => !n.read_at);
    if (filter === "credits") return items.filter((n) => n.type === "credits_low" || n.type === "credits");
    if (filter === "plan_upgrade")
      return items.filter((n) => n.type === "plan_upgrade" || n.type === "plan-upgrade");
    if (filter === "email") return items.filter((n) => n.type === "email" || n.type === "message");
    return items.filter((n) => n.type === filter);
  }, [items, filter]);

  const grouped = useMemo(() => {
    const today: NotificationRow[] = [];
    const yesterday: NotificationRow[] = [];
    const earlier: NotificationRow[] = [];
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startOfYesterday = startOfToday - 24 * 60 * 60 * 1000;
    for (const n of filtered) {
      const t = new Date(n.created_at).getTime();
      if (t >= startOfToday) today.push(n);
      else if (t >= startOfYesterday) yesterday.push(n);
      else earlier.push(n);
    }
    return { today, yesterday, earlier };
  }, [filtered]);

  const markOne = async (id: string) => {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, read_at: new Date().toISOString() } : it)));
    await markFn({ data: { id } });
  };

  const markAll = async () => {
    setItems((prev) => prev.map((it) => ({ ...it, read_at: it.read_at ?? new Date().toISOString() })));
    await markAllFn();
  };

  const filters: Array<{ key: Filter; label: string }> = [
    { key: "all", label: "All" },
    { key: "unread", label: `Unread${unreadCount ? ` (${unreadCount})` : ""}` },
    { key: "signal_alert", label: "Signals" },
    { key: "plan_upgrade", label: "Plan" },
    { key: "credits", label: "Credits" },
    { key: "email", label: "Messages" },
    { key: "security", label: "Security" },
    { key: "welcome", label: "Welcome" },
  ];

  return (
    <div className="max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-full bg-zinc-900 text-white flex items-center justify-center">
            <BellRing className="h-4 w-4" />
          </div>
          <div>
            <h1 className="text-[15px] font-semibold text-zinc-900 leading-tight">Notifications</h1>
            <p className="text-[11px] text-zinc-500">
              {unreadCount > 0 ? `${unreadCount} unread` : "You're all caught up"}
            </p>
          </div>
        </div>
        <button
          onClick={markAll}
          disabled={unreadCount === 0}
          className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-zinc-200 bg-white text-[12px] font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
        >
          <CheckCheck className="h-3.5 w-3.5" />
          Mark all read
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={cn(
              "h-7 px-3 rounded-full text-[11px] font-medium transition",
              filter === f.key
                ? "bg-zinc-900 text-white"
                : "bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-50",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="rounded-xl border border-zinc-200 bg-white p-10 text-center text-[12px] text-zinc-400">
          Loading…
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-200 bg-white p-12 text-center">
          <div className="mx-auto h-12 w-12 rounded-full bg-zinc-50 flex items-center justify-center mb-3">
            <Inbox className="h-5 w-5 text-zinc-400" />
          </div>
          <p className="text-[13px] font-medium text-zinc-700">No notifications</p>
          <p className="mt-1 text-[11px] text-zinc-500">
            When you get signal alerts, plan updates or messages, they'll show up here.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {(["today", "yesterday", "earlier"] as const).map((bucket) => {
            const rows = grouped[bucket];
            if (rows.length === 0) return null;
            const label = bucket === "today" ? "Today" : bucket === "yesterday" ? "Yesterday" : "Earlier";
            return (
              <section key={bucket}>
                <div className="text-[10px] uppercase tracking-wider font-semibold text-zinc-400 mb-2 px-1">
                  {label}
                </div>
                <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden divide-y divide-zinc-100">
                  {rows.map((n) => {
                    const v = visualFor(n);
                    const isUnread = !n.read_at;
                    return (
                      <Link
                        key={n.id}
                        to={v.href}
                        search={v.search as never}
                        onClick={() => {
                          if (isUnread) markOne(n.id);
                        }}
                        className={cn(
                          "flex items-start gap-3 px-4 py-3 hover:bg-zinc-50/70 transition group",
                          isUnread && "bg-blue-50/30",
                        )}
                      >
                        <div
                          className={cn(
                            "shrink-0 h-9 w-9 rounded-full flex items-center justify-center",
                            v.wrap,
                          )}
                        >
                          <v.Icon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p
                              className={cn(
                                "text-[13px] leading-tight truncate",
                                isUnread ? "font-semibold text-zinc-900" : "font-medium text-zinc-800",
                              )}
                            >
                              {n.title}
                            </p>
                            {isUnread && (
                              <span className="shrink-0 h-1.5 w-1.5 rounded-full bg-blue-500" aria-hidden />
                            )}
                          </div>
                          {n.body && (
                            <p className="mt-0.5 text-[12px] text-zinc-500 line-clamp-2">{n.body}</p>
                          )}
                          <div className="mt-1 flex items-center gap-2 text-[10px] text-zinc-400">
                            <span className="inline-flex items-center gap-1">
                              <Bell className="h-2.5 w-2.5" />
                              {v.label}
                            </span>
                            <span>·</span>
                            <span>{timeAgo(n.created_at)}</span>
                          </div>
                        </div>
                        {isUnread && (
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              markOne(n.id);
                            }}
                            className="opacity-0 group-hover:opacity-100 shrink-0 h-7 w-7 rounded-md hover:bg-zinc-100 flex items-center justify-center text-zinc-500 transition"
                            title="Mark as read"
                          >
                            <Check className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
