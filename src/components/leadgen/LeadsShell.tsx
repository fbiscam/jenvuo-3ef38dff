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
} from "lucide-react";
import type { Me } from "@/lib/leadgen/shared";

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
  const isActive = (to: string, exact?: boolean) =>
    exact ? pathname === to || pathname === `${to}/` : pathname.startsWith(to);

  const pct = me && me.credits.monthly_limit > 0
    ? Math.min(100, (me.credits.used / me.credits.monthly_limit) * 100)
    : 0;

  return (
    <div className="lg-console flex min-h-dvh w-full bg-[#F8F9FA] text-[#202124]">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-[#DADCE0] bg-white md:flex">
        <div className="flex h-14 items-center gap-2 border-b border-[#DADCE0] px-4">
          <img src="/favicon.png" alt="Jenvu" className="h-6 w-6 rounded object-contain" />
          <span className="text-[15px] font-medium text-[#3C4043]">Jenvu Leads</span>
        </div>

        <nav className="flex-1 overflow-y-auto py-2">
          {NAV.map((item) => {
            const active = isActive(item.to, item.exact);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`mx-2 mb-0.5 flex items-center gap-3 rounded-r-full px-4 py-2 text-[13px] transition ${
                  active
                    ? "bg-[#E8F0FE] font-medium text-[#1967D2]"
                    : "text-[#3C4043] hover:bg-[#F1F3F4]"
                }`}
              >
                <item.icon className="h-4 w-4" strokeWidth={active ? 2.2 : 1.8} />
                {item.label}
              </Link>
            );
          })}

          {me?.is_admin && (
            <>
              <div className="mt-4 px-5 pb-1 text-[11px] font-medium uppercase tracking-wider text-[#80868B]">
                Admin
              </div>
              <Link
                to="/leads/admin/users"
                className={`mx-2 flex items-center gap-3 rounded-r-full px-4 py-2 text-[13px] transition ${
                  isActive("/leads/admin")
                    ? "bg-[#E8F0FE] font-medium text-[#1967D2]"
                    : "text-[#3C4043] hover:bg-[#F1F3F4]"
                }`}
              >
                <Shield className="h-4 w-4" strokeWidth={1.8} />
                Users
              </Link>
            </>
          )}
        </nav>

        {me && (
          <div className="border-t border-[#DADCE0] p-4">
            <div className="flex items-baseline justify-between text-[12px] text-[#5F6368]">
              <span>Credits</span>
              <span className="font-medium text-[#202124]">
                {me.credits.remaining.toFixed(2)} left
              </span>
            </div>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[#E8EAED]">
              <div
                className="h-full rounded-full bg-[#1A73E8] transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
            <div className="mt-1.5 text-[11px] text-[#80868B]">
              {me.credits.used.toFixed(2)} of {me.credits.monthly_limit.toFixed(0)} used this month
            </div>
          </div>
        )}
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-[#DADCE0] bg-white px-4 md:px-6">
          <div className="flex items-center gap-2 md:hidden">
            <img src="/favicon.png" alt="" className="h-6 w-6 rounded object-contain" />
            <span className="text-[15px] font-medium text-[#3C4043]">Jenvu Leads</span>
          </div>
          <div className="hidden md:block" />
          <div className="flex items-center gap-3">
            {me && (
              <span className="hidden text-[12px] text-[#5F6368] sm:block">
                {me.email}
                {me.is_admin && (
                  <span className="ml-2 rounded bg-[#E8F0FE] px-1.5 py-0.5 text-[10px] font-medium text-[#1967D2]">
                    ADMIN
                  </span>
                )}
              </span>
            )}
            <Link
              to="/leads/account"
              className="rounded border border-[#DADCE0] px-3 py-1.5 text-[12px] font-medium text-[#3C4043] hover:bg-[#F1F3F4]"
            >
              Account
            </Link>
          </div>
        </header>

        <nav className="flex gap-1 overflow-x-auto border-b border-[#DADCE0] bg-white px-2 md:hidden">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={`whitespace-nowrap px-3 py-2.5 text-[12px] ${
                isActive(item.to, item.exact)
                  ? "border-b-2 border-[#1A73E8] font-medium text-[#1967D2]"
                  : "text-[#5F6368]"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <main className="min-w-0 flex-1 overflow-x-hidden p-4 md:p-6">{children}</main>
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
    <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-[22px] font-normal text-[#202124]">{title}</h1>
        {description && <p className="mt-1 text-[13px] text-[#5F6368]">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-lg border border-[#DADCE0] bg-white ${className}`}>{children}</div>
  );
}

export const btnPrimary =
  "inline-flex items-center justify-center gap-2 rounded bg-[#1A73E8] px-4 py-2 text-[13px] font-medium text-white transition hover:bg-[#1765CC] disabled:cursor-not-allowed disabled:opacity-50";
export const btnGhost =
  "inline-flex items-center justify-center gap-2 rounded border border-[#DADCE0] bg-white px-4 py-2 text-[13px] font-medium text-[#3C4043] transition hover:bg-[#F1F3F4] disabled:opacity-50";
export const inputCls =
  "w-full rounded border border-[#DADCE0] bg-white px-3 py-2 text-[13px] text-[#202124] outline-none transition placeholder:text-[#9AA0A6] focus:border-[#1A73E8] focus:ring-2 focus:ring-[#1A73E8]/15";
export const labelCls = "mb-1.5 block text-[12px] font-medium text-[#5F6368]";
