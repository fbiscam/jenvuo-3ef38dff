import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Radar,
  Bookmarks,
  Bell,
  BarChart3,
  Clock,
  Newspaper,
  CreditCard,
  HelpCircle,
  User,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

const navItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Signal Desk", url: "/signal", icon: Radar },
  { title: "Saved Signals", url: "/dashboard/workspace", icon: Bookmarks },
  { title: "Alerts", url: "/dashboard/alerts", icon: Bell },
  { title: "Analytics", url: "/dashboard/analytics", icon: BarChart3 },
  { title: "Killzones", url: "/killzones", icon: Clock },
  { title: "Insights", url: "/insights", icon: Newspaper },
  { title: "Pricing", url: "/pricing", icon: CreditCard },
  { title: "Help", url: "/help", icon: HelpCircle },
  { title: "Profile", url: "/dashboard/profile", icon: User },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const currentPath = useRouterState({
    select: (router) => router.location.pathname,
  });

  const isActive = (path: string) => {
    if (path === "/signal") return currentPath === "/signal";
    return currentPath === path || currentPath.startsWith(`${path}/`);
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <SidebarGroup defaultOpen>
          <SidebarGroupLabel>Trading Desk</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)} tooltip={item.title}>
                    <Link to={item.url} className="flex items-center gap-2">
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
