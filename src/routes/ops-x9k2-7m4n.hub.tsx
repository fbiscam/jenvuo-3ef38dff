import JenvuMark from "@/components/JenvuMark";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useState } from "react";
import type { ReactNode } from "react";
import {
  Activity,
  ArrowRight,
  Crown,
  FileText,
  Inbox,
  Lock,
  Mail,
  Megaphone,
  ShieldCheck,
  SlidersHorizontal,
  Target,
  Users,
  Wallet,
} from "lucide-react";
import { opsLock, opsStatus } from "@/lib/ops-gate.functions";
import { opsPendingCounts, type OpsCounts } from "@/lib/ops-counts.functions";
import { OpsCount, ops } from "@/components/ops/OpsPage";
import { dashExternal } from "@/lib/url-rewrite";

export const Route = createFileRoute("/ops-x9k2-7m4n/hub")({
  head: () => ({
    meta: [
      { title: "Ops Console · Hub" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: OpsHub,
});

type Tile = {
  key: string;
  title: string;
  desc: string;
  to: string;
  icon: ReactNode;
  group: "Customers" | "Money" | "Signals";
  countKey?: keyof OpsCounts;
};

const TILES: Tile[] = [
  { key: "inbox", countKey: "inbox", title: "Support Inbox", desc: "Contact & live-chat messages", to: "/jenvu-ops-x9k2/inbox", icon: <Inbox />, group: "Customers" },
  { key: "announcements", title: "Site Notices", desc: "Updates, new bot & issue alerts for users", to: "/dashboard/admin/announcements", icon: <Megaphone />, group: "Customers" },
  { key: "emails", title: "Email Box", desc: "Send from support@ or sales@jenvu.com", to: "/dashboard/admin/emails", icon: <Mail />, group: "Customers" },
  { key: "messages", countKey: "messages", title: "Contact Messages", desc: "Legacy contact form entries", to: "/dashboard/admin/messages", icon: <Mail />, group: "Customers" },
  { key: "subs", title: "Newsletter Subscribers", desc: "Email list & signal opt-ins", to: "/dashboard/admin/subscribers", icon: <Users />, group: "Customers" },
  { key: "founding", countKey: "founding", title: "Founding Applications", desc: "Review & approve applicants", to: "/dashboard/admin/founding", icon: <Crown />, group: "Customers" },
  { key: "docs", countKey: "documents", title: "Document Submissions", desc: "Earning-proof review", to: "/dashboard/admin/documents", icon: <FileText />, group: "Customers" },
  { key: "audit", title: "Scan Audit", desc: "AI cost & scan ledger", to: "/dashboard/admin/scan-audit", icon: <ShieldCheck />, group: "Money" },
  { key: "accuracy", title: "Accuracy Dashboard", desc: "Paper-trade win rate & drift", to: "/dashboard/admin/accuracy", icon: <Target />, group: "Signals" },
  { key: "tuning", title: "Weight Tuning", desc: "Grid search & walk-forward configs", to: "/dashboard/admin/tuning", icon: <SlidersHorizontal />, group: "Signals" },
  { key: "tvmm", title: "TV Mismatch Checker", desc: "Signal chart price drift audit", to: "/dashboard/admin/tv-mismatch", icon: <Activity />, group: "Signals" },
  
  { key: "payments", countKey: "payments", title: "Payments & Promos", desc: "Crypto top-ups, approvals & promo codes", to: "/ops-x9k2-7m4n/payments", icon: <Wallet />, group: "Money" },


];

const GROUPS: { name: Tile["group"] }[] = [{ name: "Customers" }, { name: "Money" }, { name: "Signals" }];

const PENDING: { key: keyof OpsCounts; label: string; hint: string; tile: string }[] = [
  { key: "founding", label: "New applications", hint: "Founding · waiting for review", tile: "founding" },
  { key: "payments", label: "Payments to review", hint: "Crypto & card orders", tile: "payments" },
  { key: "inbox", label: "Support & emails", hint: "Live chat + contact messages", tile: "inbox" },
  { key: "documents", label: "Documents", hint: "ID & earning proofs", tile: "docs" },
];

function OpsHub() {
  const router = useRouter();
  const lock = useServerFn(opsLock);
  const status = useServerFn(opsStatus);
  const [ready, setReady] = useState(false);
  const [active, setActive] = useState<Tile | null>(null);
  const fetchCounts = useServerFn(opsPendingCounts);
  const [counts, setCounts] = useState<OpsCounts | null>(null);
  const refresh = useCallback(async () => {
    try {
      const token = window.sessionStorage.getItem("jenvu_ops_token") ?? undefined;
      setCounts(await fetchCounts({ data: { token } }));
    } catch {
      /* keep last numbers */
    }
  }, [fetchCounts]);

  useEffect(() => {
    if (!ready) return;
    void refresh();
    const id = window.setInterval(() => void refresh(), 30_000);
    return () => window.clearInterval(id);
  }, [ready, refresh]);

  useEffect(() => {
    let alive = true;
    const token = window.sessionStorage.getItem("jenvu_ops_token") ?? undefined;
    status({ data: { token } })
      .then((s) => {
        if (!alive) return;
        if (s.unlocked) setReady(true);
        else router.navigate({ to: "/ops-x9k2-7m4n", replace: true });
      })
      .catch(() => {
        if (alive) router.navigate({ to: "/ops-x9k2-7m4n", replace: true });
      });
    return () => {
      alive = false;
    };
  }, [router, status]);

  async function onLock() {
    window.sessionStorage.removeItem("jenvu_ops_token");
    await lock({});
    await router.navigate({ to: "/ops-x9k2-7m4n" });
  }

  const SANS = "font-['Google_Sans_Flex','Google_Sans','Product_Sans','Poppins',system-ui,sans-serif]";

  if (!ready) {
    return <div className="min-h-dvh w-full bg-background" />;
  }

  const total = (counts?.inbox ?? 0) + (counts?.founding ?? 0) + (counts?.documents ?? 0) + (counts?.payments ?? 0);
  const countFor = (t: Tile) => (t.countKey && counts ? counts[t.countKey] : 0);

  return (
    <div className={`ops-console min-h-dvh w-full bg-background text-foreground ${SANS} antialiased`}>
      <header className="sticky top-0 z-30 flex min-h-14 items-center gap-3 border-b border-border bg-background/90 px-4 py-2 backdrop-blur sm:px-6">
        <JenvuMark className="h-7 w-7 text-foreground" />
        <div className="min-w-0">
          <div className="truncate text-[15px] font-medium text-foreground">Ops Console</div>
          <div className="hidden text-[12.5px] text-muted-foreground sm:block">Restricted · authorized team only</div>
        </div>
        <span className="ops-chip ml-auto hidden items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-medium sm:inline-flex">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-gc-green" /> Live
        </span>
        <button onClick={onLock} className={`${ops.btn} ml-auto sm:ml-0`}>
          <Lock className="h-3.5 w-3.5" /> Lock
        </button>
      </header>
      <main className="mx-auto w-full max-w-[1280px] px-4 pb-12 pt-6 sm:px-6 sm:pt-8">
        <h1 className="text-[24px] font-medium tracking-tight sm:text-[28px]">Overview</h1>
        <p className="mt-1 text-[13.5px] text-muted-foreground">
          {total > 0 ? `${total} new item${total === 1 ? "" : "s"} waiting for you.` : "Nothing new waiting right now."}
        </p>
        <section className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {PENDING.map((p) => {
            const v = counts ? counts[p.key] : null;
            const tile = TILES.find((t) => t.key === p.tile);
            return (
              <button
                key={p.key}
                type="button"
                onClick={() => tile && setActive(tile)}
                className="ops-card ops-tile relative rounded-2xl px-4 py-4 text-left transition sm:px-5"
              >
                <div className="flex items-center justify-between text-[12.5px] text-muted-foreground">
                  {p.label}
                  {!!v && <span className="h-2 w-2 rounded-full bg-[#ef4444]" aria-hidden />}
                </div>
                <div className="mt-2 text-[24px] font-medium tabular-nums text-foreground">{v ?? "–"}</div>
                <div className="mt-0.5 text-[12px] text-muted-foreground">{p.hint}</div>
              </button>
            );
          })}
        </section>

        {GROUPS.map((g) => (
          <section key={g.name} className="mt-8">
            <h2 className="text-[13px] font-medium text-muted-foreground">{g.name}</h2>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {TILES.filter((t) => t.group === g.name).map((t) => {
                const c = countFor(t);
                return (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => setActive(t)}
                    className="ops-card ops-tile group relative flex items-start gap-3 rounded-2xl p-4 text-left transition"
                  >
                    <span className="ops-chip relative grid h-10 w-10 shrink-0 place-items-center rounded-xl [&_svg]:h-[18px] [&_svg]:w-[18px]">
                      {t.icon}
                      <OpsCount value={c} className="absolute -right-2 -top-2" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[14px] font-medium text-foreground">{t.title}</span>
                      <span className="mt-0.5 block text-[13px] text-muted-foreground">
                        {c ? <span className="font-medium text-foreground">{c} new · </span> : null}
                        {t.desc}
                      </span>
                    </span>
                    <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-foreground" />
                  </button>
                );
              })}
            </div>
          </section>
        ))}

        {active && (
          /* Fullscreen embedded section */
          <div className="ops-console fixed inset-0 z-50 flex flex-col bg-background">
            <div className="flex min-h-14 items-center gap-3 border-b border-border bg-background px-3 py-2 sm:px-6">
              <button
                onClick={() => {
                  setActive(null);
                  void refresh();
                }}
                className={ops.btn}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
                Back
              </button>
              <div className="flex min-w-0 flex-col leading-tight">
                <span className="truncate text-[14px] font-medium text-foreground">{active.title}</span>
                <span className="hidden truncate text-[12px] text-muted-foreground sm:block">{active.desc}</span>
              </div>
              <div className="ml-auto flex items-center gap-2">
                <a href={toolUrl(active, false)} target="_blank" rel="noreferrer" className="hidden text-[13px] text-muted-foreground hover:text-foreground sm:inline">
                  Open in new tab ↗
                </a>
                <button onClick={onLock} className={ops.btn}>
                  Lock
                </button>
              </div>
            </div>
            <iframe key={active.key} src={toolUrl(active, true)} title={active.title} className="h-full w-full flex-1 bg-background" />
          </div>
        )}
      </main>
    </div>
  );
}

/** Dashboard tools live on dash.jenvu.com: link there directly (no extra redirect hop). */
function toolUrl(t: Tile, embed: boolean): string {
  let base = t.to;
  if (typeof window !== "undefined" && t.to.startsWith("/dashboard/")) {
    const host = window.location.hostname;
    if (host === "jenvu.com" || host.endsWith(".jenvu.com")) base = `https://dash.jenvu.com${dashExternal(t.to)}`;
  }
  if (!embed) return base;
  const token = typeof window !== "undefined" ? window.sessionStorage.getItem("jenvu_ops_token") : null;
  return `${base}${base.includes("?") ? "&" : "?"}embed=1${token ? `&t=${encodeURIComponent(token)}` : ""}`;
}
