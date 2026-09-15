import { Link, useRouterState } from "@tanstack/react-router";
import {
  BadgeDollarSign,
  ChartNoAxesCombined,
  ChevronsLeft,
  ChevronsRight,
  CircleHelp,
  FileCheck2,
  LayoutDashboard,
  LockKeyhole,
  type LucideIcon,
  MessageSquare,
  Puzzle,
  Tag,
  Wallet,
  X,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";

type NavItem = { to: string; label: string; icon: LucideIcon; exact?: boolean };

const NAV_GROUPS: Array<{ id: string; items: NavItem[] }> = [
  {
    id: "overview",
    items: [{ to: "/dashboard", label: "Overview", icon: LayoutDashboard, exact: true }],
  },
  {
    id: "work",
    items: [
      { to: "/chat", label: "Chat", icon: MessageSquare },
      { to: "/dashboard/usage", label: "Usage", icon: ChartNoAxesCombined },
    ],
  },
  {
    id: "keys",
    items: [
      { to: "/dashboard/extension", label: "API Keys", icon: Puzzle },
      { to: "/pricing", label: "Pricing", icon: Tag },
    ],
  },
  {
    id: "account",
    items: [
      { to: "/dashboard/billing", label: "Billing", icon: Wallet },
      { to: "/dashboard/pay", label: "Payments", icon: BadgeDollarSign },
      { to: "/dashboard/documents", label: "Documents", icon: FileCheck2 },
      { to: "/dashboard/security", label: "Security", icon: LockKeyhole },
      { to: "/help", label: "Help Center", icon: CircleHelp },
    ],
  },
];

export function MainSidebar({
  collapsed,
  onToggleCollapsed,
  mobileOpen,
  onCloseMobile,
}: {
  collapsed: boolean;
  onToggleCollapsed: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <aside
      className={`dashboard-sidebar-root max-lg:fixed max-lg:inset-y-0 max-lg:left-0 max-lg:z-50 flex min-h-0 shrink-0 flex-col overflow-hidden border-r border-zinc-200 bg-sidebar transition-[width,transform] duration-200 ease-out ${collapsed ? "w-[60px]" : "w-[200px]"} ${mobileOpen ? "max-lg:translate-x-0" : "max-lg:-translate-x-full"}`}
      style={{
        fontFamily: '"Google Sans", "Product Sans", "Roboto", system-ui, sans-serif',
        fontWeight: 400,
      }}
    >
      <div
        className={`flex h-11 shrink-0 items-center gap-2.5 bg-sidebar ${collapsed ? "justify-center px-2" : "px-4"}`}
      >
        <Link to="/" className="flex min-w-0 items-center gap-2.5">
          <img
            src="/favicon.png"
            alt="JENVU"
            className="h-7 w-7 shrink-0 rounded-md object-contain"
          />
          {!collapsed && (
            <span
              className="truncate text-[22px] leading-none tracking-tight"
              style={{
                color: "#3c4043",
                fontFamily: '"Google Sans", "Product Sans", "DM Sans", system-ui, sans-serif',
                fontWeight: 500,
              }}
            >
              Jenvu
            </span>
          )}
        </Link>
        <button
          type="button"
          aria-label="Close menu"
          onClick={onCloseMobile}
          className="ml-auto rounded-md p-1.5 text-zinc-500 hover:bg-zinc-100 lg:hidden"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <nav className="sidebar-hover-scroll min-h-0 flex-1 overflow-y-auto overflow-x-hidden bg-sidebar px-2 py-2">
        {NAV_GROUPS.map((group, gi) => (
          <div key={group.id} className={gi > 0 ? "mt-2" : ""}>
            <div className="flex flex-col gap-1.5">
              {group.items.map((t) => {
                const active = t.exact ? pathname === t.to : pathname.startsWith(t.to);
                const Icon = t.icon;
                return (
                  <Link
                    key={t.to}
                    to={t.to as "/dashboard"}
                    resetScroll={false}
                    onClick={onCloseMobile}
                    title={collapsed ? t.label : undefined}
                    className={`group relative flex items-center rounded-full text-[12.5px] font-normal text-foreground transition ${collapsed ? "justify-center px-2 py-1.5" : "gap-3 px-2.5 py-1.5"} ${active ? "bg-[#EBEBEB]" : "hover:bg-zinc-50"}`}
                  >
                    <Icon
                      className="h-[19px] w-[19px] shrink-0 text-current"
                      strokeWidth={1.75}
                      aria-hidden="true"
                    />
                    {!collapsed && <span className="truncate">{t.label}</span>}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div
        className={`mt-auto flex shrink-0 items-center border-t border-zinc-200 bg-sidebar py-2 ${collapsed ? "justify-center px-2" : "justify-between pl-3 pr-2"}`}
      >
        {!collapsed && (
          <button
            type="button"
            onClick={() => void supabase.auth.signOut()}
            title="Sign out"
            aria-label="Sign out"
            className="inline-flex h-7 w-7 items-center justify-center rounded-md text-zinc-900 hover:bg-red-50 hover:text-red-600"
          >
            <span className="text-[11px] font-semibold">⏻</span>
          </button>
        )}
        <button
          type="button"
          onClick={onToggleCollapsed}
          title={collapsed ? "Expand" : "Collapse"}
          aria-label={collapsed ? "Expand" : "Collapse"}
          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
        >
          {collapsed ? (
            <ChevronsRight className="h-3.5 w-3.5" />
          ) : (
            <ChevronsLeft className="h-3.5 w-3.5" />
          )}
        </button>
      </div>
    </aside>
  );
}
