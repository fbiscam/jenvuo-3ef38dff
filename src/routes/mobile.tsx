import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Compass, List, CandlestickChart, User, TrendingUp, TrendingDown, Wallet, LogOut, ChevronRight, Bell, Shield, HelpCircle, Gift } from "lucide-react";
import { useLiveTicker } from "@/hooks/useLiveTicker";
import { useAuthUser } from "@/hooks/useAuthUser";
import { useCredits } from "@/hooks/useCredits";
import { authSignInUrl, signOutAndRedirect } from "@/lib/cross-domain-session";
import { cn } from "@/lib/utils";

type Tab = "explore" | "watchlist" | "chart" | "profile";

export const Route = createFileRoute("/mobile")({
  validateSearch: (s: Record<string, unknown>): { tab?: Tab } => {
    const t = s.tab;
    return t === "explore" || t === "watchlist" || t === "chart" || t === "profile" ? { tab: t } : {};
  },
  head: () => ({
    meta: [
      { title: "Jenvu App — Gold Markets, Chart & Profile" },
      { name: "description", content: "Jenvu mobile app: explore market movers, watch XAU/USD live, open the gold chart and manage your balance." },
      { property: "og:title", content: "Jenvu App — Gold Markets, Chart & Profile" },
      { property: "og:description", content: "Live XAU/USD chart, market movers and your Jenvu balance in one mobile app." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
    ],
  }),
  component: MobileApp,
});

function MobileApp() {
  const { tab = "explore" } = Route.useSearch();
  const navigate = Route.useNavigate();
  const setTab = (t: Tab) => navigate({ to: ".", search: { tab: t }, replace: true });

  return (
    <div className="min-h-[100dvh] bg-background text-foreground flex flex-col">
      <main className="flex-1 overflow-y-auto pb-24">
        {tab === "explore" && <Explore />}
        {tab === "watchlist" && <Watchlist onOpenChart={() => setTab("chart")} />}
        {tab === "chart" && <ChartTab />}
        {tab === "profile" && <Profile />}
      </main>
      <nav className="fixed bottom-0 inset-x-0 z-40 border-t border-border bg-background/95 backdrop-blur pb-[env(safe-area-inset-bottom)]">
        <div className="grid grid-cols-4 max-w-lg mx-auto">
          {([
            ["explore", "Explore", Compass],
            ["watchlist", "Watchlist", List],
            ["chart", "Chart", CandlestickChart],
            ["profile", "Profile", User],
          ] as const).map(([key, label, Icon]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={cn("flex flex-col items-center gap-1 py-2.5 text-[11px]", tab === key ? "text-foreground font-semibold" : "text-muted-foreground")}
            >
              <Icon className="h-5 w-5" />
              {label}
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}

function Header({ title }: { title: string }) {
  return (
    <header className="sticky top-0 z-30 bg-background/95 backdrop-blur px-4 pt-[calc(env(safe-area-inset-top)+12px)] pb-3">
      <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
    </header>
  );
}

function useRows() {
  return useLiveTicker().map(([name, price, delta]) => ({ name, price, delta, up: !delta.startsWith("-") }));
}

function Change({ delta, up }: { delta: string; up: boolean }) {
  if (delta === "…") return <span className="text-muted-foreground text-sm">…</span>;
  return (
    <span className={cn("inline-flex min-w-[72px] justify-center rounded-md px-2 py-1 text-sm font-semibold tabular-nums text-primary-foreground", up ? "bg-[hsl(var(--success,142_71%_40%))]" : "bg-destructive")}>
      {delta}
    </span>
  );
}

function Explore() {
  const rows = useRows();
  const gainers = rows.filter((r) => r.up && r.delta !== "…");
  const losers = rows.filter((r) => !r.up);
  const gold = rows[0];
  return (
    <>
      <Header title="Explore" />
      <section className="px-4">
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="text-xs text-muted-foreground">XAU/USD · Gold Spot</div>
          <div className="mt-1 flex items-end justify-between">
            <div className="text-3xl font-bold tabular-nums">{gold.price}</div>
            <Change delta={gold.delta} up={gold.up} />
          </div>
        </div>
      </section>
      <MoverList title="Going up" icon={<TrendingUp className="h-4 w-4" />} rows={gainers} />
      <MoverList title="Going down" icon={<TrendingDown className="h-4 w-4" />} rows={losers} />
    </>
  );
}

function MoverList({ title, icon, rows }: { title: string; icon: React.ReactNode; rows: ReturnType<typeof useRows> }) {
  return (
    <section className="px-4 mt-6">
      <h2 className="flex items-center gap-2 text-lg font-semibold mb-2">{icon}{title}</h2>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground py-3">Nothing here right now.</p>
      ) : (
        <ul className="divide-y divide-border">
          {rows.map((r) => (
            <li key={r.name} className="flex items-center justify-between py-3">
              <span className="font-medium">{r.name}</span>
              <span className="flex items-center gap-3"><span className="tabular-nums">{r.price}</span><Change delta={r.delta} up={r.up} /></span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Watchlist({ onOpenChart }: { onOpenChart: () => void }) {
  const rows = useRows();
  return (
    <>
      <Header title="Watchlist" />
      <ul className="px-4 divide-y divide-border">
        {rows.map((r) => (
          <li key={r.name}>
            <button onClick={r.name === "XAU/USD" ? onOpenChart : undefined} className="w-full flex items-center justify-between py-3.5 text-left">
              <span>
                <span className="block font-semibold">{r.name}</span>
                <span className="block text-xs text-muted-foreground">{r.name === "XAU/USD" ? "Tap to open chart" : "Live"}</span>
              </span>
              <span className="flex items-center gap-3"><span className="tabular-nums">{r.price}</span><Change delta={r.delta} up={r.up} /></span>
            </button>
          </li>
        ))}
      </ul>
    </>
  );
}

function ChartTab() {
  const [tf, setTf] = useState("15");
  const tfs = [["1", "1m"], ["5", "5m"], ["15", "15m"], ["60", "1h"], ["240", "4h"], ["D", "1D"]];
  const src = `https://s.tradingview.com/widgetembed/?symbol=OANDA%3AXAUUSD&interval=${tf}&theme=dark&style=1&hide_side_toolbar=1&withdateranges=0&locale=en`;
  return (
    <div className="flex flex-col h-[calc(100dvh-72px)]">
      <div className="px-4 pt-[calc(env(safe-area-inset-top)+12px)] pb-2 flex items-center justify-between">
        <div>
          <div className="text-lg font-bold">XAU/USD</div>
          <div className="text-xs text-muted-foreground">Gold Spot / U.S. Dollar</div>
        </div>
        <Link to="/dashboard/terminal" className="text-xs font-semibold rounded-full border border-border px-3 py-1.5">Full terminal</Link>
      </div>
      <div className="px-4 pb-2 flex gap-1 overflow-x-auto">
        {tfs.map(([v, l]) => (
          <button key={v} onClick={() => setTf(v)} className={cn("px-3 py-1 rounded-full text-xs", tf === v ? "bg-foreground text-background font-semibold" : "text-muted-foreground")}>{l}</button>
        ))}
      </div>
      <iframe key={tf} title="XAU/USD chart" src={src} className="flex-1 w-full border-0" />
    </div>
  );
}

function Profile() {
  const { user, loading } = useAuthUser();
  const { balance, plan } = useCredits();
  if (loading) return <Header title="Profile" />;
  if (!user) {
    return (
      <>
        <Header title="Profile" />
        <div className="px-4">
          <a href={authSignInUrl("/mobile?tab=profile")} className="block text-center rounded-xl bg-primary text-primary-foreground py-3 font-semibold">Sign in</a>
        </div>
      </>
    );
  }
  const name = (user.user_metadata?.full_name as string | undefined) || user.email?.split("@")[0] || "Trader";
  const items = [
    { label: "Notifications", icon: Bell, to: "/dashboard/notifications" as const },
    { label: "Security", icon: Shield, to: "/dashboard/security" as const },
    { label: "Refer a friend", icon: Gift, to: "/dashboard/referrals" as const },
    { label: "Billing", icon: Wallet, to: "/dashboard/billing" as const },
  ];
  return (
    <>
      <Header title="Profile" />
      <section className="px-4 flex items-center gap-3">
        <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center text-xl font-bold">{name[0]?.toUpperCase()}</div>
        <div>
          <div className="font-semibold text-lg">{name}</div>
          <div className="text-xs text-muted-foreground">{user.email}</div>
        </div>
      </section>
      <section className="px-4 mt-5">
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="text-xs text-muted-foreground">Current balance</div>
          <div className="mt-1 text-3xl font-bold tabular-nums">${Number(balance).toFixed(2)}</div>
          <div className="mt-1 text-xs text-muted-foreground capitalize">Plan: {typeof plan === "string" ? plan : plan?.name ?? "free"}</div>
          <Link to="/dashboard/pay" className="mt-3 block text-center rounded-xl bg-primary text-primary-foreground py-2.5 font-semibold">Add funds</Link>
        </div>
      </section>
      <ul className="px-4 mt-5 divide-y divide-border">
        {items.map(({ label, icon: Icon, to }) => (
          <li key={label}>
            <Link to={to} className="flex items-center justify-between py-3.5">
              <span className="flex items-center gap-3"><Icon className="h-5 w-5 text-muted-foreground" />{label}</span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </Link>
          </li>
        ))}
        <li>
          <Link to="/help" className="flex items-center justify-between py-3.5">
            <span className="flex items-center gap-3"><HelpCircle className="h-5 w-5 text-muted-foreground" />Help Center</span>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </Link>
        </li>
      </ul>
      <div className="px-4 mt-6">
        <button onClick={() => void signOutAndRedirect("/mobile?tab=profile")} className="w-full flex items-center justify-center gap-2 rounded-xl border border-destructive text-destructive py-3 font-semibold">
          <LogOut className="h-4 w-4" />Sign out
        </button>
      </div>
    </>
  );
}
