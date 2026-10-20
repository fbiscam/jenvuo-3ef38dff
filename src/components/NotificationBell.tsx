import { useEffect, useRef, useState, useCallback } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  Bell,
  TrendingUp,
  TrendingDown,
  Crown,
  Coins,
  Mail,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import {
  listNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  type NotificationRow,
} from "@/lib/notifications.functions";

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.max(0, Math.floor(diff / 1000));
  const plural = (n: number, unit: string) => `${n} ${unit}${n === 1 ? "" : "s"} ago`;
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return plural(m, "minute");
  const h = Math.floor(m / 60);
  if (h < 24) return plural(h, "hour");
  const d = Math.floor(h / 24);
  return plural(d, "day");
}

function beep() {
  try {
    const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const t0 = ctx.currentTime;
    const tones = [880, 1175, 1568];
    tones.forEach((f, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "sine";
      o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t0 + i * 0.12);
      g.gain.exponentialRampToValueAtTime(0.18, t0 + i * 0.12 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + i * 0.12 + 0.18);
      o.connect(g);
      g.connect(ctx.destination);
      o.start(t0 + i * 0.12);
      o.stop(t0 + i * 0.12 + 0.2);
    });
    setTimeout(() => ctx.close().catch(() => {}), 800);
  } catch {
    /* ignore */
  }
}

type Visual = {
  Icon: React.ComponentType<{ className?: string }>;
  tone: string;
  href: string;
  search?: Record<string, string>;
};

function visualFor(n: NotificationRow): Visual {
  const t = n.type;
  if (t === "signal_alert") {
    const isBuy = (n.data?.direction as string) === "BUY";
    const alertId = (n.data?.alert_id as string) || undefined;
    return {
      Icon: isBuy ? TrendingUp : TrendingDown,
      tone: isBuy ? "text-gc-success" : "text-destructive",
      href: "/dashboard/notifications",
      search: alertId ? { alertId } : undefined,
    };
  }
  if (t === "plan_upgrade" || t === "plan-upgrade")
    return { Icon: Crown, tone: "text-gc-blue-deep", href: "/dashboard" };
  if (t === "credits_low" || t === "credits")
    return { Icon: Coins, tone: "text-gc-blue-deep", href: "/dashboard" };
  if (t === "email" || t === "message")
    return { Icon: Mail, tone: "text-gc-blue-deep", href: "/dashboard" };
  if (t === "security")
    return { Icon: ShieldCheck, tone: "text-gc-success", href: "/dashboard/security" };
  return { Icon: CheckCircle2, tone: "text-gc-success", href: "/dashboard" };
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
      /* silent */
    }
  }, [listFn]);

  useEffect(() => {
    load();
    const t = setInterval(load, 60_000);
    return () => clearInterval(t);
  }, [load]);

  // Realtime: refresh on insert/update/delete of this user's notifications
  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let cancelled = false;
    (async () => {
      const { data } = await supabase.auth.getUser();
      const uid = data.user?.id;
      if (!uid || cancelled) return;
      channel = supabase
        .channel(`user_notifications:${uid}:${Math.random().toString(36).slice(2)}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "user_notifications",
            filter: `user_id=eq.${uid}`,
          },
          (payload) => {
            if (payload.eventType === "INSERT") {
              beep();
            }
            load();
          },
        )
        .subscribe();
    })();
    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
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
      /* keep optimistic */
    }
  };

  return (
    <div className="relative" ref={wrapRef}>
      <button
        onClick={onOpen}
        aria-label="Notifications"
        className="relative inline-flex h-9 w-9 items-center justify-center rounded-full bg-transparent text-zinc-700 transition-colors hover:bg-zinc-100/60"
      >
        <Bell className="h-4 w-4" />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-[15px] min-w-[15px] items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold leading-none text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed right-2 top-14 z-50 w-[min(20rem,calc(100vw-1rem))] overflow-hidden rounded-2xl bg-gc-canvas shadow-[0_4px_16px_rgba(60,64,67,0.18),0_1px_3px_rgba(60,64,67,0.12)] sm:absolute sm:left-auto sm:right-0 sm:top-11 sm:w-[400px]">
          <div className="border-b border-gc-blue-deep/25 px-3 py-2.5 text-center sm:px-4 sm:py-3.5">
            <span className="text-[14px] font-normal text-gc-ink">Notifications</span>
          </div>

          <div className="max-h-[min(55vh,380px)] sm:max-h-[min(460px,70vh)] overflow-y-auto overscroll-contain py-1">
            {items.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <p className="text-[13px] text-gc-ink">You're all caught up</p>
                <p className="mt-0.5 text-[12px] text-gc-ink-muted">
                  Signals, plan updates & alerts land here.
                </p>
              </div>
            ) : (
              items.map((n) => {
                const v = visualFor(n);
                const Icon = v.Icon;
                return (
                  <div
                    key={n.id}
                    onMouseEnter={() => {
                      if (!n.read_at) markOne(n.id);
                    }}
                    className={cn(
                      "flex items-start gap-2.5 px-3 py-2 transition-colors sm:gap-3 sm:px-4 sm:py-3 transition-colors hover:bg-gc-nav-active",
                      !n.read_at && "bg-gc-nav-active/60",
                    )}
                  >
                    <Icon className={cn("mt-0.5 h-[18px] w-[18px] shrink-0", v.tone)} />
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] text-gc-ink sm:text-[14px]">{n.title}</p>
                      {n.body && <p className="mt-0.5 line-clamp-3 text-[12px] leading-snug text-gc-ink-muted sm:line-clamp-none sm:text-[13px]">{n.body}</p>}
                    </div>
                    <span className="shrink-0 text-[11px] text-gc-ink-muted sm:text-[12px]">
                      {timeAgo(n.created_at)}
                    </span>
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
