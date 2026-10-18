import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import type { ReactNode } from "react";
import {
  LayoutGrid,
  MapPin,
  Users,
  Globe,
  Upload,
  ListChecks,
  Activity,
  Shield,
  Menu,
  Search,
  X,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { Me } from "@/lib/leadgen/shared";

/**
 * Jenvu design language (matches jenvu.com):
 *  - surface #FAFAFA, cards white with zinc-200 hairlines
 *  - ink zinc-900 / zinc-700 / zinc-500, no coloured brand accent
 *  - Google Sans for UI, JetBrains Mono for micro-labels and numerics
 */
export const JENVU_SANS =
  '"Google Sans", "Product Sans", "Poppins", system-ui, sans-serif';
export const MONO = "font-['JetBrains_Mono',ui-monospace,monospace]";

const NAV = [
  { to: "/leads", label: "Overview", icon: LayoutGrid, exact: true },
  { to: "/leads/maps", label: "Maps search", icon: MapPin },
  { to: "/leads/people", label: "People search", icon: Users },
  { to: "/leads/enrich", label: "Enrich", icon: Globe },
  { to: "/leads/import", label: "Import", icon: Upload },
  { to: "/leads/lists", label: "Lists", icon: ListChecks },
  { to: "/leads/activity", label: "Activity", icon: Activity },
];

export function LeadsShell({ me, children }: { me: Me | null; children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [q, setQ] = useState("");
  const [focused, setFocused] = useState(false);
  const isActive = (to: string, exact?: boolean) =>
    exact ? pathname === to || pathname === `${to}/` : pathname.startsWith(to);

  const pct = me && me.credits.monthly_limit > 0
    ? Math.min(100, (me.credits.used / me.credits.monthly_limit) * 100)
    : 0;

  const allNav = me?.is_admin
    ? [...NAV, { to: "/leads/admin/users", label: "Users", icon: Shield }]
    : NAV;
  const t = q.trim().toLowerCase();
  const matches = t ? allNav.filter((n) => n.label.toLowerCase().includes(t)).slice(0, 6) : [];
  const go = (to: string) => {
    setQ("");
    void navigate({ to: to as "/leads" });
  };

  const navLink = (item: (typeof allNav)[number]) => {
    const active = isActive(item.to, "exact" in item ? item.exact : false);
    return (
      <Link
        key={item.to}
        to={item.to}
        onClick={() => setMenuOpen(false)}
        className={`flex items-center gap-3.5 rounded-r-full py-2 pl-4 pr-3 text-[14px] text-gc-ink transition ${active ? "bg-gc-nav-active" : "hover:bg-gc-notice"}`}
      >
        <item.icon className="h-[19px] w-[19px] shrink-0" strokeWidth={1.75} />
        <span className="truncate">{item.label}</span>
      </Link>
    );
  };

  return (
    <div
      className="lg-console flex min-h-dvh w-full flex-col bg-gc-canvas text-gc-ink antialiased"
      style={{ fontFamily: JENVU_SANS }}
    >
      {menuOpen && (
        <button
          type="button"
          aria-label="Close menu"
          className="fixed inset-0 z-40 bg-foreground/30"
          onClick={() => setMenuOpen(false)}
        />
      )}
      <aside
        aria-hidden={!menuOpen}
        className={`fixed inset-y-0 left-0 z-50 flex h-dvh w-[280px] flex-col overflow-hidden rounded-r-2xl bg-gc-canvas transition-transform duration-200 ${menuOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"}`}
      >
        <div className="flex h-14 shrink-0 items-center gap-2.5 border-b border-gc-line px-3">
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setMenuOpen(false)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full text-gc-ink-muted hover:bg-gc-notice"
          >
            <X className="h-5 w-5" />
          </button>
          <a href="https://jenvu.com" className="flex items-center gap-2.5">
            <img src="/favicon.png" alt="Jenvu" className="h-6 w-6 rounded-md object-contain" />
            <span className="text-[20px] font-medium tracking-tight">Jenvu <span className="text-gc-ink-muted">Leads</span></span>
          </a>
        </div>
        <nav className="flex-1 overflow-y-auto py-2 pr-3">
          <div className="flex flex-col gap-1">{NAV.map(navLink)}</div>
          {me?.is_admin && (
            <div className="mt-3 border-t border-gc-line pt-3">
              <div className="mb-1.5 px-4 text-[11px] tracking-wider text-gc-ink-muted">ADMIN</div>
              {navLink({ to: "/leads/admin/users", label: "Users", icon: Shield })}
            </div>
          )}
        </nav>
        {me && me.credits.monthly_limit > 0 && (
          <div className="shrink-0 border-t border-gc-line px-4 py-3">
            <div className="flex justify-between text-[12px] text-gc-ink-muted">
              <span>Monthly credits</span>
              <span>{me.credits.used} / {me.credits.monthly_limit}</span>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-gc-line">
              <div className="h-full rounded-full bg-gc-blue" style={{ width: `${pct}%` }} />
            </div>
          </div>
        )}
      </aside>

      <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 bg-gc-canvas px-2 sm:gap-3 sm:px-3">
        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          aria-label="Open menu"
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-gc-ink-muted hover:bg-gc-notice"
        >
          <Menu className="h-5 w-5" />
        </button>
        <Link to="/leads" className="flex shrink-0 items-center gap-2 pr-2">
          <img src="/favicon.png" alt="" className="h-6 w-6 rounded-md object-contain" />
          <span className="text-[20px] font-medium tracking-tight">Jenvu <span className="text-gc-ink-muted">Leads</span></span>
        </Link>
        <div className="relative mx-auto hidden w-full max-w-[720px] sm:block">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (matches[0]) go(matches[0].to);
            }}
            className="flex h-10 items-center rounded-full border border-gc-line bg-gc-notice pl-4 pr-1 focus-within:bg-background focus-within:shadow-sm"
          >
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => window.setTimeout(() => setFocused(false), 150)}
              placeholder="Search lead tools"
              aria-label="Search"
              className="min-w-0 flex-1 bg-transparent text-[14px] outline-none placeholder:text-gc-ink-muted"
            />
            <button type="submit" className="inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[14px] hover:bg-gc-line/50">
              <Search className="h-4 w-4" /> Search
            </button>
          </form>
          {focused && t && (
            <div className="absolute left-0 right-0 top-12 overflow-hidden rounded-2xl border border-gc-line bg-background py-1 shadow-lg">
              {matches.length === 0 ? (
                <div className="px-4 py-3 text-[13px] text-gc-ink-muted">No tools match "{q}"</div>
              ) : (
                matches.map((m) => (
                  <button
                    key={m.to}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => go(m.to)}
                    className="block w-full px-4 py-2 text-left text-[14px] hover:bg-gc-canvas"
                  >
                    {m.label}
                  </button>
                ))
              )}
            </div>
          )}
        </div>
        <div className="ml-auto flex shrink-0 items-center gap-2 sm:ml-0">
          {me && (
            <span className="hidden text-[13px] text-gc-ink-muted lg:block">
              {me.email}
              {me.is_admin && (
                <span className={`ml-2 rounded bg-gc-ink px-1.5 py-0.5 text-[10px] text-background ${MONO}`}>ADMIN</span>
              )}
            </span>
          )}
          <Button asChild variant="outline" size="sm" className="rounded-full">
            <Link to="/leads/account">Account</Link>
          </Button>
        </div>
      </header>

      <div className="flex min-h-0 w-full flex-1 flex-col overflow-hidden bg-background sm:mx-2 sm:w-auto sm:rounded-t-[20px]">
        <main className="leads-shell-zoom mx-auto w-full max-w-7xl min-w-0 flex-1 overflow-x-hidden px-5 py-7 sm:px-8">{children}</main>
      </div>
    </div>
  );
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 pb-3 sm:flex sm:flex-wrap sm:justify-between">
      <div className="min-w-0">
        <h1 className="truncate text-[25px] font-medium leading-tight text-foreground">{title}</h1>
        {description && <p className="mt-1 text-[13px] text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`overflow-hidden rounded-xl border border-border bg-card ring-1 ring-background/60 ${className}`}
    >
      {children}
    </div>
  );
}

export const btnPrimary =
  "inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-[13px] font-medium text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50";
export const btnGhost =
  "inline-flex items-center justify-center gap-2 rounded-md border border-input bg-background px-4 py-2 text-[13px] font-medium text-foreground transition hover:bg-accent disabled:opacity-50";
export const inputCls =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-[13px] text-foreground outline-hidden transition placeholder:text-muted-foreground focus:border-ring focus:ring-1 focus:ring-ring";
export const labelCls = "mb-1.5 block text-[12px] font-medium text-muted-foreground";
