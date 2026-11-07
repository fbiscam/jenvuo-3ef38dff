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
  LayoutGrid,
  Lock,
  Mail,
  Menu,
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
import { dashExternal } from "@/lib/url-rewrite";
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
  const [navOpen, setNavOpen] = useState(false);
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

  const select = (t: Tile | null) => {
    setActive(t);
    setNavOpen(false);
    if (!t) void refresh();
  };

  const toggleTheme = () => {
    const next = dark ? "light" : "dark";
    saveSiteTheme(next);
    applyHtmlTheme(window.location.pathname);
    setDark(!dark);
  };

  const sidebar = (
    <nav className="flex h-full flex-col">
      <div className="flex h-14 shrink-0 items-center gap-2.5 px-4">
        <JenvuMark className="h-6 w-6 text-foreground" />
        <span className="text-[15px] font-medium text-foreground">Ops Console</span>
        <span className="ml-auto inline-flex items-center gap-1.5 text-[11.5px] text-muted-foreground">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-gc-green" /> Live
        </span>
      </div>
      <div className="flex-1 overflow-y-auto px-2.5 pb-3">
        <NavItem active={!active} onClick={() => select(null)} icon={<LayoutGrid />} label="Overview" count={total} />
        {GROUPS.map((g) => (
          <div key={g.name} className="mt-4">
            <div className="px-2.5 pb-1 text-[11.5px] font-medium text-muted-foreground">{g.name}</div>
            {TILES.filter((t) => t.group === g.name).map((t) => (
              <NavItem key={t.key} active={active?.key === t.key} onClick={() => select(t)} icon={t.icon} label={t.title} count={countFor(t)} />
            ))}
          </div>
        ))}
      </div>
      <div className="ops-line flex shrink-0 items-center gap-2 border-t px-3 py-3">
        <button onClick={toggleTheme} className={`${ops.btn} h-9 w-9 px-0`} aria-label={dark ? "White theme" : "Black theme"}>
          {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
        <button onClick={onLock} className={`${ops.btn} flex-1`}>
          <Lock className="h-3.5 w-3.5" /> Lock console
        </button>
      </div>
    </nav>
  );

  return (
    <div className={`ops-console flex h-dvh w-full overflow-hidden bg-background text-foreground ${SANS} antialiased`}>
      {/* Desktop: pinned sidebar, same as the dashboard */}
      <aside className="ops-side ops-zoom hidden w-[248px] shrink-0 lg:block" style={{ minHeight: 0 }}>
        {sidebar}
      </aside>
      {/* Phones: drawer */}
      {navOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button aria-label="Close menu" className="absolute inset-0 bg-foreground/30" onClick={() => setNavOpen(false)} />
          <aside className="ops-side absolute inset-y-0 left-0 w-[272px] max-w-[85vw] shadow-xl">{sidebar}</aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="ops-line flex h-14 shrink-0 items-center gap-3 border-b px-3 sm:px-5 lg:hidden">
          <button onClick={() => setNavOpen(true)} className={`${ops.btn} h-9 w-9 px-0`} aria-label="Open menu">
            <Menu className="h-4 w-4" />
          </button>
          <span className="truncate text-[15px] font-medium">{active ? active.title : "Overview"}</span>
          {total > 0 && <OpsCount value={total} className="ml-auto" />}
        </header>

        {active ? (
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="ops-line hidden h-12 shrink-0 items-center gap-3 border-b px-5 lg:flex">
              <span className="text-[14px] font-medium text-foreground">{active.title}</span>
              <span className="truncate text-[12.5px] text-muted-foreground">{active.desc}</span>
              <a href={toolUrl(active, false)} target="_blank" rel="noreferrer" className="ml-auto text-[13px] text-muted-foreground hover:text-foreground">
                Open in new tab ↗
              </a>
            </div>
            <iframe key={active.key} src={toolUrl(active, true)} title={active.title} className="min-h-0 w-full flex-1 bg-background" />
          </div>
        ) : (
          <main className="min-h-0 flex-1 overflow-y-auto">
            <div className="ops-zoom mx-auto w-full max-w-[1100px] px-5 pb-12 pt-8 sm:px-8 lg:pt-10" style={{ minHeight: 0 }}>
              <h1 className="text-[30px] font-normal tracking-tight sm:text-[34px]">Overview</h1>
              <p className="mt-1 text-[14px] text-muted-foreground">
                {total > 0 ? `${total} new item${total === 1 ? "" : "s"} waiting for you.` : "Nothing new waiting right now."}
              </p>
              <section className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
                {PENDING.map((p) => {
                  const v = counts ? counts[p.key] : null;
                  const tile = TILES.find((t) => t.key === p.tile);
                  return (
                    <button
                      key={p.key}
                      type="button"
                      onClick={() => tile && select(tile)}
                      className="ops-card ops-tile relative rounded-2xl px-4 py-4 text-left transition sm:px-5"
                    >
                      <div className="flex items-center justify-between text-[12.5px] text-muted-foreground">
                        {p.label}
                        {!!v && <span className="h-2 w-2 rounded-full bg-gc-red" aria-hidden />}
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
                          onClick={() => select(t)}
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
            </div>
          </main>
        )}
      </div>
    </div>
  );
}

function NavItem({ active, onClick, icon, label, count }: { active: boolean; onClick: () => void; icon: ReactNode; label: string; count?: number }) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-active={active}
      className="ops-nav-item flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13.5px] transition [&_svg]:h-4 [&_svg]:w-4 [&_svg]:shrink-0"
    >
      {icon}
      <span className="min-w-0 flex-1 truncate">{label}</span>
      <OpsCount value={count} />
    </button>
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
