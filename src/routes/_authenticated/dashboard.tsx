import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import SiteFooter from "@/components/SiteFooter";
import { Bookmark, Bell, CreditCard, BookOpen, User, LogOut, Mic, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — Jenvu" },
      { name: "description", content: "Your saved A+ setups, alert preferences, trade journal, and billing." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: DashboardLayout,
});

const TABS: Array<{ to: string; label: string; icon: typeof Bookmark; exact?: boolean }> = [
  { to: "/dashboard", label: "Saved", icon: Bookmark, exact: true },
  { to: "/dashboard/alerts", label: "Alerts", icon: Bell },
  { to: "/dashboard/journal", label: "Journal", icon: BookOpen },
  { to: "/dashboard/billing", label: "Billing", icon: CreditCard },
  { to: "/dashboard/profile", label: "Profile", icon: User },
];

function DashboardLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [email, setEmail] = useState<string>("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? ""));
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/auth";
  };

  return (
    <div className="min-h-dvh w-full bg-white text-zinc-900 font-['Inter',system-ui,sans-serif] antialiased">
      <header className="sticky top-0 z-40 border-b border-zinc-100 bg-white/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-5 py-3 sm:px-6 sm:py-4">
          <Link to="/" className="flex items-center gap-2.5">
            <img src="/favicon.png" alt="JENVU AI" className="h-6 w-6 rounded-md object-contain" />
            <span className="font-semibold tracking-tight">JENVU AI</span>
            <span className="ml-2 hidden text-[10px] uppercase tracking-[0.25em] text-zinc-400 sm:inline">Dashboard</span>
          </Link>
          <div className="flex items-center gap-3">
            <span className="hidden text-xs text-zinc-500 sm:inline">{email}</span>
            <button
              onClick={signOut}
              className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
            >
              <LogOut className="h-3.5 w-3.5" /> Sign out
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-5 sm:px-6 py-8">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Account</h1>
        <p className="mt-1 text-sm text-zinc-500">Manage your saved setups, alerts and trade journal.</p>

        {/* Launch AI hero */}
        <Link
          to="/app"
          className="group mt-6 relative block overflow-hidden rounded-2xl border border-zinc-900 bg-zinc-950 text-white p-6 sm:p-8 transition hover:bg-black"
        >
          <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-gradient-to-br from-fuchsia-500/30 via-cyan-400/20 to-amber-300/30 blur-3xl" />
          <div className="pointer-events-none absolute -left-16 -bottom-16 h-56 w-56 rounded-full bg-gradient-to-tr from-emerald-400/20 via-sky-500/20 to-violet-500/30 blur-3xl" />
          <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/20 backdrop-blur">
                <Mic className="h-7 w-7" />
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-[0.3em] text-white/60">Voice Agent</div>
                <div className="mt-1 text-xl font-semibold tracking-tight sm:text-2xl">Launch Jenvu AI</div>
                <div className="mt-1 text-sm text-white/70">Talk live with your A+ setup analyst — ICT, SMC & multi-TF bias.</div>
              </div>
            </div>
            <span className="inline-flex items-center gap-2 self-start rounded-xl bg-white px-5 py-3 text-sm font-semibold text-zinc-900 shadow-lg shadow-black/20 transition group-hover:gap-3">
              Launch AI <ArrowRight className="h-4 w-4" />
            </span>
          </div>
        </Link>


        {/* Tab nav */}
        <nav className="mt-6 flex flex-wrap gap-1 border-b border-zinc-200">
          {TABS.map((t) => {
            const active = t.exact ? pathname === t.to : pathname.startsWith(t.to);
            const Icon = t.icon;
            return (
              <Link
                key={t.to}
                to={t.to as "/dashboard"}
                className={`-mb-px inline-flex items-center gap-2 border-b-2 px-3.5 py-2.5 text-sm transition ${
                  active
                    ? "border-zinc-900 text-zinc-900 font-medium"
                    : "border-transparent text-zinc-500 hover:text-zinc-900"
                }`}
              >
                <Icon className="h-4 w-4" />
                {t.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-8 pb-16">
          <Outlet />
        </div>
      </div>

      <SiteFooter />
    </div>
  );
}
