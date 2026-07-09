import { useEffect, useRef, useState, useCallback } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { Bell, Check, TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  listNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  type NotificationRow,
} from "@/lib/notifications.functions";

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  return `${d}d`;
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationRow[]>([]);
  const [unread, setUnread] = useState(0);
  const listFn = useServerFn(listNotifications);
  const markFn = useServerFn(markNotificationRead);
  const markAllFn = useServerFn(markAllNotificationsRead);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await listFn();
      setItems(res.items);
      setUnread(res.unread);
    } catch {
      // silent
    }
  }, [listFn]);

  useEffect(() => {
    load();
    const t = setInterval(load, 60_000);
    return () => clearInterval(t);
  }, [load]);

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    window.addEventListener("mousedown", onClick);
    return () => window.removeEventListener("mousedown", onClick);
  }, [open]);

  const onOpen = async () => {
    const willOpen = !open;
    setOpen(willOpen);
    if (willOpen) {
      await load();
      // Auto-mark everything read as soon as the user opens the panel,
      // so the unread badge doesn't come back on refresh/next visit.
      if (unread > 0) {
        setItems((prev) => prev.map((n) => (n.read_at ? n : { ...n, read_at: new Date().toISOString() })));
        setUnread(0);
        try {
          await markAllFn();
        } catch {
          /* keep optimistic */
        }
      }
    }
  };


  const markOne = async (id: string) => {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n)));
    setUnread((u) => Math.max(0, u - 1));
    try {
      await markFn({ data: { id } });
    } catch {
      /* revert on fail? keep optimistic */
    }
  };

  const markAll = async () => {
    setItems((prev) => prev.map((n) => (n.read_at ? n : { ...n, read_at: new Date().toISOString() })));
    setUnread(0);
    try {
      await markAllFn();
    } catch {
      /* keep optimistic */
    }
  };

  return (
    <div className="relative" ref={wrapRef}>
      <button
        onClick={onOpen}
        aria-label="Notifications"
        className="relative inline-flex h-9 w-9 items-center justify-center rounded-md bg-transparent text-zinc-700 hover:bg-zinc-100/50"
      >
        <Bell className="h-4 w-4" />
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-50 w-[340px] overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-lg">
          <div className="flex items-center justify-between border-b border-zinc-100 px-3 py-2">
            <div className="text-sm font-semibold text-zinc-900">Notifications</div>
            {unread > 0 && (
              <button
                onClick={markAll}
                className="text-[11px] font-medium text-zinc-600 hover:text-zinc-900"
              >
                Mark all read
              </button>
            )}
          </div>
          <div className="max-h-[440px] overflow-y-auto">
            {items.length === 0 ? (
              <div className="px-4 py-10 text-center text-xs text-zinc-500">
                No notifications yet.
              </div>
            ) : (
              items.map((n) => {
                const isSignal = n.type === "signal_alert";
                const dir = (n.data?.direction as string) || "";
                const isBuy = dir === "BUY";
                return (
                  <div
                    key={n.id}
                    className={cn(
                      "flex gap-2.5 border-b border-zinc-50 px-3 py-2.5 last:border-b-0",
                      !n.read_at && "bg-blue-50/40",
                    )}
                  >
                    <div
                      className={cn(
                        "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                        isSignal && isBuy && "bg-emerald-100 text-emerald-700",
                        isSignal && !isBuy && "bg-red-100 text-red-700",
                        !isSignal && "bg-zinc-100 text-zinc-600",
                      )}
                    >
                      {isSignal ? (
                        isBuy ? (
                          <TrendingUp className="h-4 w-4" />
                        ) : (
                          <TrendingDown className="h-4 w-4" />
                        )
                      ) : (
                        <Bell className="h-4 w-4" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <Link
                          to="/signal"
                          onClick={() => {
                            if (!n.read_at) markOne(n.id);
                            setOpen(false);
                          }}
                          className="truncate text-[13px] font-semibold text-zinc-900 hover:text-zinc-700"
                        >
                          {n.title}
                        </Link>
                        <span className="shrink-0 text-[10px] text-zinc-400">
                          {timeAgo(n.created_at)}
                        </span>
                      </div>
                      {n.body && (
                        <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-zinc-600">
                          {n.body}
                        </p>
                      )}
                    </div>
                    {!n.read_at && (
                      <button
                        onClick={() => markOne(n.id)}
                        aria-label="Mark read"
                        className="shrink-0 self-start text-zinc-400 hover:text-zinc-700"
                      >
                        <Check className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
