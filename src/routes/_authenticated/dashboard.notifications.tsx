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
  Trash2,
  Star,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  listNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
  deleteNotifications,
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

function gradeFromScore(score: unknown) {
  const n = Number(score);
  if (!Number.isFinite(n)) return "";
  if (n >= 90) return "A+";
  if (n >= 80) return "A";
  if (n >= 65) return "B";
  return "C";
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
  const deleteOneFn = useServerFn(deleteNotification);
  const deleteManyFn = useServerFn(deleteNotifications);

  const [items, setItems] = useState<NotificationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [selectionMode, setSelectionMode] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await listFn();
      setItems(res.items);
    } finally {
      setLoading(false);
    }
  }, [listFn]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await load();
      if (cancelled) return;
      // Auto mark all as read when the page opens (after load so items reflect it)
      try {
        await markAllFn();
        if (cancelled) return;
        setItems((prev) =>
          prev.map((it) => ({ ...it, read_at: it.read_at ?? new Date().toISOString() })),
        );
      } catch {
        // ignore
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  // Realtime updates
  useEffect(() => {
    let uid: string | null = null;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    (async () => {
      const { data } = await supabase.auth.getUser();
      uid = data.user?.id ?? null;
      if (!uid) return;
      channel = supabase
        .channel(`notifications-page:${uid}:${Math.random().toString(36).slice(2)}`)
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

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const visibleIds = useMemo(() => filtered.map((n) => n.id), [filtered]);
  const allSelected = visibleIds.length > 0 && visibleIds.every((id) => selected.has(id));

  const toggleSelectAll = () => {
    if (!selectionMode) {
      setSelectionMode(true);
      setSelected(new Set(visibleIds));
      return;
    }
    setSelected((prev) => {
      if (allSelected) {
        const next = new Set(prev);
        for (const id of visibleIds) next.delete(id);
        return next;
      }
      const next = new Set(prev);
      for (const id of visibleIds) next.add(id);
      return next;
    });
  };

  const clearSelection = () => {
    setSelected(new Set());
    setSelectionMode(false);
  };

  const deleteOne = async (id: string) => {
    setItems((prev) => prev.filter((it) => it.id !== id));
    setSelected((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    await deleteOneFn({ data: { id } });
  };

  const deleteSelected = async () => {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    if (!confirm(`Delete ${ids.length} notification${ids.length > 1 ? "s" : ""}?`)) return;
    setItems((prev) => prev.filter((it) => !selected.has(it.id)));
    clearSelection();
    await deleteManyFn({ data: { ids } });
  };

  const filters: Array<{ key: Filter; label: string }> = [
    { key: "all", label: "All" },
    { key: "unread", label: `Unread${unreadCount ? ` (${unreadCount})` : ""}` },
    { key: "signal_alert", label: "Signals" },
    { key: "plan_upgrade", label: "Plan" },
    { key: "credits", label: "Credits" },
    { key: "email", label: "Messages" },
    { key: "security", label: "Security" },
    
  ];

  return (
    <div className="max-w-3xl">
      {/* Filters + Mark all read */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-4">
        <div className="flex gap-1.5 min-w-0 flex-1 overflow-x-auto no-scrollbar -mx-1 px-1">

          {filters.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={cn(
                "h-7 px-3 rounded-full text-[11px] font-medium transition shrink-0 whitespace-nowrap",
                filter === f.key
                  ? "bg-zinc-900 text-white"
                  : "bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-50",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1.5 shrink-0 justify-end sm:ml-3 sm:pl-2 sm:border-l sm:border-zinc-200">
          {filtered.length > 0 && (
            <button
              onClick={selectionMode ? clearSelection : toggleSelectAll}
              className="inline-flex items-center gap-1.5 h-7 px-3 rounded-full border border-zinc-200 bg-white text-[11px] font-medium text-zinc-700 hover:bg-zinc-50 transition"
            >
              <span className="hidden sm:inline">{selectionMode ? "Cancel" : "Select all"}</span>
              <span className="sm:hidden">{selectionMode ? "✕" : "☑"}</span>
            </button>
          )}
          {selectionMode && selected.size > 0 && (
            <button
              onClick={deleteSelected}
              className="inline-flex items-center gap-1.5 h-7 px-3 rounded-full border border-red-200 bg-red-50 text-[11px] font-medium text-red-600 hover:bg-red-100 transition"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete ({selected.size})
            </button>
          )}
          <button
            onClick={markAll}
            disabled={unreadCount === 0}
            className="inline-flex items-center gap-1.5 h-7 px-3 rounded-full border border-zinc-200 bg-white text-[11px] font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            <CheckCheck className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Mark all read</span>
          </button>
        </div>
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
                <div className="flex items-center gap-2 mb-2 px-1">
                  <div className="text-[10px] uppercase tracking-[0.12em] font-semibold text-zinc-500">
                    {label}
                  </div>
                  <span className="text-[10px] font-medium text-zinc-400">·</span>
                  <span className="text-[10px] font-medium text-zinc-400">{rows.length}</span>
                  <div className="flex-1 h-px bg-gradient-to-r from-zinc-200 to-transparent ml-1" />
                </div>
                <div className="rounded-2xl border border-zinc-200/70 bg-white overflow-hidden divide-y divide-zinc-100 shadow-[0_1px_2px_rgba(0,0,0,0.03),0_8px_24px_-16px_rgba(0,0,0,0.08)]">
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
                          "relative flex items-start gap-3 px-4 sm:px-5 py-4 transition-all duration-200 group",
                          "hover:bg-gradient-to-r hover:from-zinc-50/80 hover:to-transparent",
                          isUnread && "bg-gradient-to-r from-blue-50/60 via-blue-50/20 to-transparent",
                        )}
                      >
                        {isUnread && (
                          <span
                            aria-hidden
                            className="absolute left-0 top-3 bottom-3 w-[3px] rounded-r-full bg-gradient-to-b from-blue-500 to-blue-600 shadow-[0_0_8px_rgba(59,130,246,0.4)]"
                          />
                        )}
                        {selectionMode && (
                          <div
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              toggleSelect(n.id);
                            }}
                            className="shrink-0 flex items-center pt-1.5"
                          >
                            <input
                              type="checkbox"
                              checked={selected.has(n.id)}
                              onChange={() => toggleSelect(n.id)}
                              onClick={(e) => e.stopPropagation()}
                              className="h-3.5 w-3.5 accent-zinc-900 cursor-pointer"
                              aria-label="Select notification"
                            />
                          </div>
                        )}
                        <div
                          className={cn(
                            "shrink-0 h-10 w-10 rounded-xl flex items-center justify-center ring-1 ring-inset ring-white/50 shadow-sm transition-transform group-hover:scale-[1.03]",
                            v.wrap,
                          )}
                        >
                          <v.Icon className="h-[18px] w-[18px]" />
                        </div>
                        <div className="min-w-0 flex-1">
                          {n.type === "signal_alert" ? (
                            (() => {
                              const d = (n.data ?? {}) as Record<string, unknown>;
                              const pair = String(d.pair ?? "");
                              const direction = String(d.direction ?? "").toUpperCase();
                              const isBuy = direction === "BUY";
                              const grade = gradeFromScore(d.setup_score ?? d.setupScore ?? d.score ?? d.confidence) || (d.grade ? String(d.grade) : "");
                              const entry = d.entry != null ? String(d.entry) : "";
                              const sl = d.sl != null ? String(d.sl) : "";
                              const tp = d.tp != null ? String(d.tp) : "";
                              const rr = d.rr != null ? Number(d.rr).toFixed(2) : "";
                              const rationale = n.body?.includes(" — ") ? n.body.split(" — ").slice(1).join(" — ") : "";
                              return (
                                <>
                                  {/* Header row: pair + direction + timestamp */}
                                  <div className="flex items-center gap-2 mb-2 min-w-0">
                                    <span className="text-[15px] font-bold text-zinc-900 tracking-tight truncate">
                                      {pair || n.title}
                                    </span>
                                    {direction && (
                                      <span
                                        className={cn(
                                          "shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide ring-1 ring-inset",
                                          isBuy
                                            ? "bg-emerald-50 text-emerald-700 ring-emerald-200/70"
                                            : "bg-rose-50 text-rose-700 ring-rose-200/70",
                                        )}
                                      >
                                        {isBuy ? (
                                          <TrendingUp className="h-2.5 w-2.5" />
                                        ) : (
                                          <TrendingDown className="h-2.5 w-2.5" />
                                        )}
                                        {direction}
                                      </span>
                                    )}
                                    {grade && (
                                      <span
                                        className={cn(
                                          "shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold ring-1 ring-inset",
                                          grade.startsWith("A+")
                                            ? "bg-amber-50 text-amber-700 ring-amber-200/70"
                                            : grade.startsWith("A")
                                              ? "bg-yellow-50 text-yellow-700 ring-yellow-200/70"
                                              : grade.startsWith("B")
                                                ? "bg-blue-50 text-blue-700 ring-blue-200/70"
                                                : "bg-zinc-50 text-zinc-600 ring-zinc-200/70",
                                        )}
                                      >
                                        <Star
                                          className={cn(
                                            "h-2.5 w-2.5",
                                            grade.startsWith("A+") || grade.startsWith("A")
                                              ? "fill-current"
                                              : "",
                                          )}
                                        />
                                        {grade}
                                      </span>
                                    )}
                                    <div className="ml-auto shrink-0 flex items-center gap-1.5 text-[10px] pt-0.5">
                                      <span className="tabular-nums font-medium text-zinc-500">
                                        {timeAgo(n.created_at)}
                                      </span>
                                      {isUnread && (
                                        <span
                                          aria-hidden
                                          className="h-1.5 w-1.5 rounded-full bg-blue-500 shadow-[0_0_6px_rgba(59,130,246,0.6)] animate-pulse"
                                        />
                                      )}
                                    </div>
                                  </div>

                                  {/* Stats row: Entry / SL / TP / R:R with dividers */}
                                  {(entry || sl || tp || rr) && (
                                    <div className="flex items-stretch gap-0 mb-2 rounded-lg border border-zinc-200/80 bg-zinc-50/60 divide-x divide-zinc-200/80 overflow-hidden">
                                      {entry && (
                                        <div className="flex-1 flex flex-col px-3 py-1.5 min-w-0">
                                          <span className="text-[9px] text-zinc-500 uppercase font-semibold tracking-wider">Entry</span>
                                          <span className="text-[13px] font-semibold text-zinc-900 font-mono tabular-nums truncate">{entry}</span>
                                        </div>
                                      )}
                                      {sl && (
                                        <div className="flex-1 flex flex-col px-3 py-1.5 min-w-0">
                                          <span className="text-[9px] text-zinc-500 uppercase font-semibold tracking-wider">SL</span>
                                          <span className="text-[13px] font-semibold text-rose-600 font-mono tabular-nums truncate">{sl}</span>
                                        </div>
                                      )}
                                      {tp && (
                                        <div className="flex-1 flex flex-col px-3 py-1.5 min-w-0">
                                          <span className="text-[9px] text-zinc-500 uppercase font-semibold tracking-wider">TP</span>
                                          <span className="text-[13px] font-semibold text-emerald-600 font-mono tabular-nums truncate">{tp}</span>
                                        </div>
                                      )}
                                      {rr && (
                                        <div className="flex-1 flex flex-col px-3 py-1.5 min-w-0">
                                          <span className="text-[9px] text-zinc-500 uppercase font-semibold tracking-wider">R:R</span>
                                          <span className="text-[13px] font-bold text-zinc-900 font-mono tabular-nums truncate">1:{rr}</span>
                                        </div>
                                      )}
                                    </div>
                                  )}

                                  {/* Rationale */}
                                  {rationale && (
                                    <p
                                      className="text-[12px] leading-[1.5] text-zinc-500 break-words overflow-hidden"
                                      style={{
                                        display: "-webkit-box",
                                        WebkitBoxOrient: "vertical",
                                        WebkitLineClamp: 2,
                                      }}
                                    >
                                      {rationale}
                                    </p>
                                  )}
                                </>
                              );
                            })()
                          ) : (
                            <>
                              <div className="flex items-start gap-2">
                                <p
                                  className={cn(
                                    "text-[13px] leading-tight truncate flex-1 min-w-0 tracking-[-0.01em]",
                                    isUnread ? "font-semibold text-zinc-900" : "font-medium text-zinc-700",
                                  )}
                                >
                                  {n.title}
                                </p>
                                <div className="shrink-0 flex items-center gap-1.5 text-[10px] text-zinc-400 pt-[3px]">
                                  <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-zinc-100/80 px-2 py-0.5 text-[9px] font-medium text-zinc-600 ring-1 ring-inset ring-zinc-200/60">
                                    <Bell className="h-2.5 w-2.5" />
                                    {v.label}
                                  </span>
                                  <span className="tabular-nums font-medium text-zinc-500">{timeAgo(n.created_at)}</span>
                                  {isUnread && (
                                    <span
                                      aria-hidden
                                      className="h-1.5 w-1.5 rounded-full bg-blue-500 shadow-[0_0_6px_rgba(59,130,246,0.6)] animate-pulse"
                                    />
                                  )}
                                </div>
                              </div>
                              {n.body && (
                                <p
                                  className={cn(
                                    "mt-1.5 text-[12px] leading-[1.55] break-words overflow-hidden",
                                    isUnread ? "text-zinc-600" : "text-zinc-500",
                                  )}
                                  style={{
                                    display: "-webkit-box",
                                    WebkitBoxOrient: "vertical",
                                    WebkitLineClamp: 2,
                                  }}
                                >
                                  {n.body}
                                </p>
                              )}
                            </>
                          )}
                        </div>


                        <div className="shrink-0 flex items-center gap-1 self-center">
                          {isUnread && (
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                markOne(n.id);
                              }}
                              className="opacity-0 group-hover:opacity-100 h-7 w-7 rounded-lg hover:bg-blue-50 hover:text-blue-600 flex items-center justify-center text-zinc-500 transition-all"
                              title="Mark as read"
                            >
                              <Check className="h-3.5 w-3.5" />
                            </button>
                          )}
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              deleteOne(n.id);
                            }}
                            className="opacity-0 group-hover:opacity-100 h-7 w-7 rounded-lg hover:bg-red-50 flex items-center justify-center text-zinc-500 hover:text-red-600 transition-all"
                            title="Delete"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
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
