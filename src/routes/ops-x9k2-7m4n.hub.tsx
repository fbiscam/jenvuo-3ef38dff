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
  Moon,
  Sun,
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
import { applyHtmlTheme, readSiteTheme, saveSiteTheme } from "@/lib/site-theme";

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
  { key: "announcements", title: "Site Notices", desc: "Updates, new bot & issue alerts for users", to: "/ops-x9k2-7m4n/announcements", icon: <Megaphone />, group: "Customers" },
  { key: "emails", title: "Email Box", desc: "Send from support@ or sales@jenvu.com", to: "/ops-x9k2-7m4n/emails", icon: <Mail />, group: "Customers" },
  { key: "messages", countKey: "messages", title: "Contact Messages", desc: "Legacy contact form entries", to: "/ops-x9k2-7m4n/messages", icon: <Mail />, group: "Customers" },
  { key: "subs", title: "Newsletter Subscribers", desc: "Email list & signal opt-ins", to: "/ops-x9k2-7m4n/subscribers", icon: <Users />, group: "Customers" },
  { key: "founding", countKey: "founding", title: "Founding Applications", desc: "Review & approve applicants", to: "/ops-x9k2-7m4n/founding", icon: <Crown />, group: "Customers" },
  { key: "docs", countKey: "documents", title: "Document Submissions", desc: "Earning-proof review", to: "/ops-x9k2-7m4n/documents", icon: <FileText />, group: "Customers" },
  { key: "audit", title: "Scan Audit", desc: "AI cost & scan ledger", to: "/ops-x9k2-7m4n/scan-audit", icon: <ShieldCheck />, group: "Money" },
  { key: "accuracy", title: "Accuracy Dashboard", desc: "Paper-trade win rate & drift", to: "/ops-x9k2-7m4n/accuracy", icon: <Target />, group: "Signals" },
  { key: "tuning", title: "Weight Tuning", desc: "Grid search & walk-forward configs", to: "/ops-x9k2-7m4n/tuning", icon: <SlidersHorizontal />, group: "Signals" },
  { key: "tvmm", title: "TV Mismatch Checker", desc: "Signal chart price drift audit", to: "/ops-x9k2-7m4n/tv-mismatch", icon: <Activity />, group: "Signals" },
  
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
  const [dark, setDark] = useState(false);
  useEffect(() => setDark(readSiteTheme() === "dark"), []);
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


  const toggleTheme = () => {
    const next = dark ? "light" : "dark";
    saveSiteTheme(next);
    applyHtmlTheme(window.location.pathname);
    setDark(!dark);
  };

  return (
    <div className={`ops-console min-h-dvh w-full bg-background text-foreground ${SANS} antialiased`}>
      <header className="ops-line sticky top-0 z-30 border-b bg-background">
        <div className="ops-shell-zoom mx-auto flex h-14 w-full max-w-[1100px] items-center gap-3 px-5 sm:px-8" style={{ minHeight: 0 }}>
          <JenvuMark className="h-6 w-6 text-foreground" />
          <span className="text-[15px] font-medium text-foreground">Ops Console</span>
          <span className="hidden items-center gap-1.5 text-[12px] text-muted-foreground sm:inline-flex">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-gc-green" /> Live · Restricted team
          </span>
          <div className="ml-auto flex items-center gap-2">
            {total > 0 && <OpsCount value={total} />}
            <button onClick={toggleTheme} className={`${ops.btn} h-9 w-9 px-0`} aria-label={dark ? "White theme" : "Black theme"}>
              {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <button onClick={onLock} className={ops.btn}>
              <Lock className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Lock console</span>
            </button>
          </div>
        </div>
      </header>

      <main className="ops-shell-zoom mx-auto w-full max-w-[1100px] px-5 pb-12 pt-8 sm:px-8 lg:pt-10" style={{ minHeight: 0 }}>
        <h1 className="text-[30px] font-normal tracking-tight sm:text-[34px]">Overview</h1>
        <p className="mt-1 text-[14px] text-muted-foreground">
          {total > 0 ? `${total} new item${total === 1 ? "" : "s"} waiting for you.` : "Nothing new waiting right now."}
        </p>

        <section className="mt-5 grid grid-cols-2 gap-2 lg:grid-cols-4">
          {PENDING.map((p) => {
            const v = counts ? counts[p.key] : null;
            const tile = TILES.find((t) => t.key === p.tile);
            return (
              <a
                key={p.key}
                href={tile ? toolUrl(tile) : undefined}
                className="ops-card ops-tile relative flex min-h-[120px] flex-col rounded-2xl p-4 text-left transition sm:p-5"
              >
                <div className="flex items-center justify-between text-[13px] text-muted-foreground">
                  {p.label}
                  {!!v && <span className="h-2 w-2 rounded-full bg-gc-red" aria-hidden />}
                </div>
                <div className="mt-1 text-[22px] font-medium tabular-nums text-foreground">{v ?? "–"}</div>
                <div className="mt-auto pt-2 text-[12px] text-muted-foreground">{p.hint}</div>
              </a>
            );
          })}
        </section>

        {GROUPS.map((g) => (
          <section key={g.name} className="mt-10">
            <h2 className="text-[18px] font-medium text-foreground">{g.name}</h2>
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {TILES.filter((t) => t.group === g.name).map((t) => {
                const c = countFor(t);
                return (
                  <a
                    key={t.key}
                    href={toolUrl(t)}
                    className="ops-card ops-tile group relative flex items-start gap-3 rounded-2xl p-4 text-left transition sm:p-5"
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
                  </a>
                );
              })}
            </div>
          </section>
        ))}
      </main>
    </div>
  );
}

/** Every tool opens as its own console page next to this overview. */
function toolUrl(t: Tile): string {
  return t.to;
}
