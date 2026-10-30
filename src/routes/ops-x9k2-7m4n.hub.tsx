import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import {
  Activity,
  ArrowRight,
  Crown,
  FileText,
  Inbox,
  Lock,
  Mail,
  ShieldCheck,
  SlidersHorizontal,
  Target,
  Users,
  Wallet,
} from "lucide-react";
import { opsLock, opsStatus } from "@/lib/ops-gate.functions";

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
};

const TILES: Tile[] = [
  { key: "inbox", title: "Support Inbox", desc: "Contact & live-chat messages", to: "/jenvu-ops-x9k2/inbox", icon: <Inbox />, group: "Customers" },
  { key: "messages", title: "Contact Messages", desc: "Legacy contact form entries", to: "/dashboard/admin/messages", icon: <Mail />, group: "Customers" },
  { key: "subs", title: "Newsletter Subscribers", desc: "Email list & signal opt-ins", to: "/dashboard/admin/subscribers", icon: <Users />, group: "Customers" },
  { key: "founding", title: "Founding Applications", desc: "Review & approve applicants", to: "/dashboard/admin/founding", icon: <Crown />, group: "Customers" },
  { key: "docs", title: "Document Submissions", desc: "Earning-proof review", to: "/dashboard/admin/documents", icon: <FileText />, group: "Customers" },
  { key: "audit", title: "Scan Audit", desc: "AI cost & scan ledger", to: "/dashboard/admin/scan-audit", icon: <ShieldCheck />, group: "Money" },
  { key: "accuracy", title: "Accuracy Dashboard", desc: "Paper-trade win rate & drift", to: "/dashboard/admin/accuracy", icon: <Target />, group: "Signals" },
  { key: "tuning", title: "Weight Tuning", desc: "Grid search & walk-forward configs", to: "/dashboard/admin/tuning", icon: <SlidersHorizontal />, group: "Signals" },
  { key: "tvmm", title: "TV Mismatch Checker", desc: "Signal chart price drift audit", to: "/dashboard/admin/tv-mismatch", icon: <Activity />, group: "Signals" },
  
  { key: "payments", title: "Payments & Promos", desc: "Crypto top-ups, approvals & promo codes", to: "/ops-x9k2-7m4n/payments", icon: <Wallet />, group: "Money" },


];

const GROUPS: { name: Tile["group"]; tone: string }[] = [
  { name: "Customers", tone: "bg-gc-sky text-gc-blue-deep" },
  { name: "Money", tone: "bg-gc-green-soft text-gc-success" },
  { name: "Signals", tone: "bg-gc-yellow-soft text-gc-amber" },
];

function OpsHub() {
  const router = useRouter();
  const lock = useServerFn(opsLock);
  const status = useServerFn(opsStatus);
  const [ready, setReady] = useState(false);
  const [active, setActive] = useState<Tile | null>(null);

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

  const SANS = "font-['Google_Sans','Product_Sans','Poppins',system-ui,sans-serif]";

  if (!ready) {
    return <div className="min-h-dvh w-full bg-background" />;
  }

  return (
    <div className={`min-h-dvh w-full bg-background text-foreground ${SANS} antialiased`}>
      <header className="sticky top-0 z-30 flex min-h-14 items-center gap-3 border-b border-border bg-background px-4 py-2 sm:px-6">
        <img src="/favicon.png" alt="Jenvu" className="h-7 w-7 rounded-md object-contain" />
        <div className="min-w-0">
          <div className="truncate text-[15px] font-medium text-foreground">Operations hub</div>
          <div className="hidden text-[13px] text-muted-foreground sm:block">Restricted · authorized team only</div>
        </div>
        <span className="ml-auto hidden items-center gap-1.5 rounded-full bg-gc-green-soft px-2.5 py-1 text-[12px] font-medium text-gc-success sm:inline-flex">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-gc-green" /> Live
        </span>
        <button onClick={onLock} className="ml-auto inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-background px-3 text-[13px] font-medium text-foreground transition hover:bg-muted sm:ml-0">
          <Lock className="h-3.5 w-3.5" /> Lock
        </button>
      </header>
      <main>
        <section className="grid grid-cols-2 border-b border-border sm:grid-cols-4">
          {[
            { label: "Tools", value: TILES.length },
            ...GROUPS.map((g) => ({ label: g.name, value: TILES.filter((t) => t.group === g.name).length })),
          ].map((s, i) => (
            <div key={s.label} className={`px-4 py-5 sm:px-6 ${i % 2 === 1 ? "border-l border-border" : ""} ${i >= 2 ? "border-t border-border sm:border-t-0" : ""} ${i === 2 ? "sm:border-l" : ""}`}>
              <div className="text-[13px] text-muted-foreground">{s.label}</div>
              <div className="mt-2 text-xl font-medium tabular-nums text-foreground">{s.value}</div>
            </div>
          ))}
        </section>

        {!active ? (
          <div>
            {GROUPS.map((g) => (
              <section key={g.name} className="border-b border-border">
                <h2 className="px-4 pt-5 text-[13px] font-medium text-foreground sm:px-6">{g.name}</h2>
                <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 sm:px-6 lg:grid-cols-3">
                  {TILES.filter((t) => t.group === g.name).map((t) => (
                    <button
                      key={t.key}
                      type="button"
                      onClick={() => setActive(t)}
                      className="group flex items-start gap-3 rounded-xl border border-border bg-background p-4 text-left transition hover:border-gc-blue-soft hover:shadow-sm"
                    >
                      <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${g.tone} [&_svg]:h-4 [&_svg]:w-4`}>{t.icon}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[14px] font-medium text-foreground">{t.title}</span>
                        <span className="mt-0.5 block text-[13px] text-muted-foreground">{t.desc}</span>
                      </span>
                      <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-foreground" />
                    </button>
                  ))}
                </div>
              </section>
            ))}
          </div>
        ) : (
          /* Fullscreen embedded section */
          <div className="fixed inset-0 z-50 flex flex-col bg-background">
            <div className="flex min-h-14 items-center gap-3 border-b border-border bg-background px-4 py-2 sm:px-6">
              <button
                onClick={() => setActive(null)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-[13px] font-medium text-foreground transition hover:bg-muted"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
                Back
              </button>
              <img src="/favicon.png" alt="Jenvu" className="h-6 w-6 rounded-md object-contain" />
              <div className="flex min-w-0 flex-col leading-tight">
                <span className="truncate text-[14px] font-medium text-foreground">{active.title}</span>
                <span className="truncate text-[12px] text-muted-foreground">{active.desc}</span>
              </div>
              <div className="ml-auto flex items-center gap-2">
                <a
                  href={active.to}
                  target="_blank"
                  rel="noreferrer"
                  className="hidden text-[13px] text-muted-foreground hover:text-foreground sm:inline"
                >
                  Open in new tab ↗
                </a>
                <button
                  onClick={onLock}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-[13px] font-medium text-foreground transition hover:bg-muted"
                >
                  Lock
                </button>
              </div>
            </div>
            <iframe
              key={active.key}
              src={`${active.to}${active.to.includes("?") ? "&" : "?"}embed=1${
                typeof window !== "undefined" && window.sessionStorage.getItem("jenvu_ops_token")
                  ? `&t=${encodeURIComponent(window.sessionStorage.getItem("jenvu_ops_token") as string)}`
                  : ""
              }`}
              title={active.title}
              className="h-full w-full flex-1 bg-background"
            />
          </div>
        )}

      </main>
    </div>
  );
}
