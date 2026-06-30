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
    window.location.href = "/";
  };


  return (
    <div className="min-h-dvh w-full bg-white text-zinc-900 font-['Inter',system-ui,sans-serif] antialiased" style={{ zoom: 1.25 }}>
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
          className="group mt-6 relative block overflow-hidden rounded-2xl border border-zinc-200 bg-white p-6 sm:p-8 shadow-[0_1px_0_rgba(0,0,0,0.04),0_24px_60px_-30px_rgba(0,0,0,0.18)] transition hover:border-zinc-300 hover:shadow-[0_1px_0_rgba(0,0,0,0.04),0_30px_70px_-30px_rgba(0,0,0,0.25)]"
        >
          {/* Ambient theme glows */}
          <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[conic-gradient(from_120deg,rgba(236,72,153,0.18),rgba(56,189,248,0.18),rgba(250,204,21,0.18),rgba(236,72,153,0.18))] blur-3xl opacity-70" />
          <div className="pointer-events-none absolute -left-20 -bottom-24 h-64 w-64 rounded-full bg-[conic-gradient(from_220deg,rgba(16,185,129,0.18),rgba(99,102,241,0.18),rgba(244,114,182,0.18),rgba(16,185,129,0.18))] blur-3xl opacity-60" />
          {/* Top accent bar */}
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-zinc-900/15 to-transparent" />

          <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-zinc-950 text-white ring-1 ring-zinc-900/10 shadow-lg shadow-zinc-900/20">
                <Mic className="h-6 w-6" />
                <span className="absolute -right-1 -top-1 inline-flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-white" />
                </span>
              </div>
              <div>
                <div className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.3em] text-zinc-500">
                  <span className="h-1 w-1 rounded-full bg-emerald-500" /> Voice Agent · Live
                </div>
                <div className="mt-1 text-xl font-semibold tracking-tight text-zinc-900 sm:text-2xl">
                  Launch <span className="bg-gradient-to-r from-zinc-900 via-zinc-700 to-zinc-900 bg-clip-text text-transparent">Jenvu AI</span>
                </div>
                <div className="mt-1 text-sm text-zinc-500">Talk live with your A+ setup analyst — ICT, SMC & multi-TF bias.</div>
              </div>
            </div>
            <span className="inline-flex items-center gap-2 self-start rounded-xl bg-zinc-950 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-zinc-900/25 transition group-hover:gap-3 group-hover:bg-black">
              Launch AI <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
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
