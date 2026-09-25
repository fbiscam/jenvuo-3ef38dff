import { Link, useRouterState } from "@tanstack/react-router";
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
  const [mobileOpen, setMobileOpen] = useState(false);
  const isActive = (to: string, exact?: boolean) =>
    exact ? pathname === to || pathname === `${to}/` : pathname.startsWith(to);

  const pct = me && me.credits.monthly_limit > 0
    ? Math.min(100, (me.credits.used / me.credits.monthly_limit) * 100)
    : 0;

  return (
    <div
      className="lg-console leads-shell-zoom flex min-h-dvh w-full bg-background text-foreground antialiased"
      style={{ fontFamily: JENVU_SANS }}
    >
      {mobileOpen && (
        <Button
          type="button"
          variant="ghost"
          aria-label="Close navigation"
          className="fixed inset-0 z-40 h-auto w-auto rounded-none bg-foreground/15 p-0 hover:bg-foreground/15 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}
      <aside
        className={`leads-sidebar-root fixed inset-y-0 left-0 z-50 flex h-dvh w-[min(82vw,280px)] flex-col overflow-hidden border-r border-border bg-sidebar transition-transform duration-200 lg:w-[200px] lg:translate-x-0 ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}
        style={{ fontFamily: JENVU_SANS, fontWeight: 400 }}
      >
        {/* Brand */}
        <div className="flex h-11 shrink-0 items-center gap-2.5 px-4">
          <img src="/favicon.png" alt="Jenvu" className="h-6 w-6 shrink-0 rounded-md object-contain" />
          <span
            className="truncate text-[22px] leading-none text-foreground"
            style={{ fontWeight: 500 }}
          >
            Jenvu
          </span>
        </div>

        <nav className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-2 py-2">
          <div className="flex flex-col gap-1.5">
            {NAV.map((item) => {
              const active = isActive(item.to, item.exact);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                    onClick={() => setMobileOpen(false)}
                    className={`group relative flex items-center gap-3 rounded-full px-2.5 py-1.5 text-[12.5px] font-normal transition ${
                    active
                      ? "bg-[#EBEBEB] text-foreground"
                      : "text-foreground hover:bg-accent"
                  }`}
                >
                  <item.icon
                    className="h-[19px] w-[19px] shrink-0"
                    strokeWidth={active ? 2.1 : 1.7}
                  />
                  <span className="truncate">{item.label}</span>
                </Link>
              );
            })}
          </div>

          {me?.is_admin && (
            <div className="mt-2 border-t border-zinc-200 pt-3">
              <div className="mb-1.5 px-2.5 text-[10px] font-normal tracking-wider text-[#9B9C9B]">
                ADMIN
              </div>
              <Link
                to="/leads/admin/users"
                className={`flex items-center gap-3 rounded-full px-2.5 py-1.5 text-[13.5px] font-medium transition ${
                  isActive("/leads/admin")
                    ? "bg-zinc-100 font-semibold text-zinc-900"
                    : "text-[#5E5E5E] hover:bg-zinc-50 hover:text-zinc-900"
                }`}
              >
                <Shield className="h-[19px] w-[19px] shrink-0" strokeWidth={1.7} />
                <span className="truncate">Users</span>
              </Link>
            </div>
          )}
        </nav>
      </aside>



      <div className="flex min-w-0 flex-1 flex-col lg:ml-[200px]">
        <header className="flex h-12 shrink-0 items-center justify-between border-b border-border bg-background px-4 lg:px-6">
          <div className="flex min-w-0 items-center gap-2.5 lg:hidden">
            <Button variant="ghost" size="icon-sm" aria-label="Open navigation" onClick={() => setMobileOpen(true)}>
              <Menu className="h-5 w-5" />
            </Button>
            <img src="/favicon.png" alt="" className="h-6 w-6 shrink-0 rounded-md object-contain" />
            <span className="truncate text-[17px] text-foreground" style={{ fontWeight: 500 }}>
              Jenvu <span className="text-zinc-400">Leads</span>
            </span>
          </div>
          <div className="hidden md:block" />
          <div className="flex items-center gap-3">
            {me && (
              <span className="hidden text-[12px] text-zinc-500 sm:block">
                {me.email}
                {me.is_admin && (
                  <span className={`ml-2 rounded bg-zinc-900 px-1.5 py-0.5 text-[10px] text-white ${MONO}`}>
                    ADMIN
                  </span>
                )}
              </span>
            )}
            <Button asChild variant="outline" size="sm"><Link to="/leads/account">Account</Link></Button>
          </div>
        </header>

        <main className="mx-auto w-full max-w-7xl min-w-0 flex-1 overflow-x-hidden px-4 py-7 sm:px-6 lg:px-8 lg:py-8">{children}</main>
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
