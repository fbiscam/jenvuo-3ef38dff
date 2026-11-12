import { Link } from "@tanstack/react-router";
import { ArrowLeft, BadgeDollarSign, FileCheck2, ShieldCheck, SlidersHorizontal, UserRound, Wallet, type LucideIcon } from "lucide-react";

/** Pages that live inside Settings; the dashboard sidebar swaps to this list on any of them. */
export const SETTINGS_PAGES: { to: string; label: string; icon: LucideIcon }[] = [
  { to: "/dashboard/settings", label: "General", icon: SlidersHorizontal },
  { to: "/dashboard/profile", label: "Personal", icon: UserRound },
  { to: "/dashboard/security", label: "Security", icon: ShieldCheck },
  { to: "/dashboard/billing", label: "Billing", icon: Wallet },
  { to: "/dashboard/pay", label: "Payments", icon: BadgeDollarSign },
  { to: "/dashboard/documents", label: "Documents", icon: FileCheck2 },
];

export function isSettingsPath(pathname: string) {
  return SETTINGS_PAGES.some((p) => pathname === p.to || pathname.startsWith(`${p.to}/`));
}

/** Sidebar contents while inside Settings: Back to the dashboard, then the Settings pages. */
export function SettingsSidebarNav({ pathname, collapsed, onNavigate }: { pathname: string; collapsed: boolean; onNavigate: () => void }) {
  return (
    <div className="flex flex-col gap-1">
      <Link
        to="/dashboard"
        onClick={onNavigate}
        title={collapsed ? "Back" : undefined}
        className={`dashboard-sidebar-link flex items-center text-[14px] font-normal text-gc-ink hover:bg-gc-notice ${collapsed ? "justify-center rounded-full px-2 py-2" : "gap-3 rounded-lg px-3 py-2"}`}
      >
        <ArrowLeft className="dashboard-sidebar-icon h-[18px] w-[18px] shrink-0 text-gc-ink" strokeWidth={1.75} aria-hidden="true" />
        {!collapsed && <span className="truncate">Back</span>}
      </Link>
      {!collapsed && <div className="sidebar-group-label mb-1 mt-4 px-3 text-[11px] font-normal text-gc-ink-muted">Settings</div>}
      {collapsed && <div className="mx-3 my-2 h-px bg-gc-line" />}
      {SETTINGS_PAGES.map((p) => {
        const active = pathname === p.to || pathname.startsWith(`${p.to}/`);
        const Icon = p.icon;
        return (
          <Link
            key={p.to}
            to={p.to as "/dashboard"}
            resetScroll={false}
            onClick={onNavigate}
            title={collapsed ? p.label : undefined}
            aria-current={active ? "page" : undefined}
            className={`dashboard-sidebar-link flex items-center text-[14px] font-normal text-gc-ink transition ${collapsed ? "justify-center rounded-full px-2 py-2" : "gap-3 rounded-lg px-3 py-2"} ${active ? "bg-gc-nav-active font-medium" : "hover:bg-gc-notice"}`}
          >
            <Icon className="dashboard-sidebar-icon h-[18px] w-[18px] shrink-0 text-gc-ink" strokeWidth={1.75} aria-hidden="true" />
            {!collapsed && <span className="truncate">{p.label}</span>}
          </Link>
        );
      })}
    </div>
  );
}

/** Shared page title for every Settings page. */
export function SettingsPageHeader({ title, description }: { title: string; description: string }) {
  return (
    <header className="jenvu-rise">
      <h1 className="text-[28px] font-medium tracking-tight text-foreground sm:text-[32px]">{title}</h1>
      <p className="mt-1 max-w-[620px] text-[14px] text-muted-foreground">{description}</p>
    </header>
  );
}
