import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
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
};

const TILES: Tile[] = [
  { key: "inbox", title: "Support Inbox", desc: "Contact & live-chat messages", to: "/jenvu-ops-x9k2/inbox" },
  { key: "messages", title: "Contact Messages", desc: "Legacy contact form entries", to: "/dashboard/admin/messages" },
  { key: "subs", title: "Newsletter Subscribers", desc: "Email list & signal opt-ins", to: "/dashboard/admin/subscribers" },
  { key: "founding", title: "Founding Applications", desc: "Review & approve applicants", to: "/dashboard/admin/founding" },
  { key: "docs", title: "Document Submissions", desc: "Earning-proof review", to: "/dashboard/admin/documents" },
  { key: "autoscan", title: "Auto-Scan Monitor", desc: "Auto-scanner state & history", to: "/dashboard/admin/auto-scan" },
  { key: "audit", title: "Scan Audit", desc: "AI cost & scan ledger", to: "/dashboard/admin/scan-audit" },
  { key: "accuracy", title: "Accuracy Dashboard", desc: "Paper-trade win rate & drift", to: "/dashboard/admin/accuracy" },
  { key: "tuning", title: "Weight Tuning", desc: "Grid search & walk-forward configs", to: "/dashboard/admin/tuning" },
  { key: "tvmm", title: "TV Mismatch Checker", desc: "Signal chart price drift audit", to: "/dashboard/admin/tv-mismatch" },
  
  { key: "leadscredits", title: "Leads Credits", desc: "Add credits to Jenvu Leads accounts", to: "/ops-x9k2-7m4n/leads-credits" },
  { key: "payments", title: "Payments & Promos", desc: "Crypto top-ups, approvals & promo codes", to: "/ops-x9k2-7m4n/payments" },


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

  const MONO = "font-['Google_Sans','Product_Sans','Roboto',system-ui,sans-serif] font-normal normal-case tracking-normal";
  const SANS = "font-['Google_Sans','Product_Sans','Poppins',system-ui,sans-serif]";

  if (!ready) {
    return <div className="min-h-dvh w-full bg-[#FAFAFA]" />;
  }

  return (
    <div className={`min-h-dvh w-full bg-white text-zinc-900 ${SANS} antialiased`}>
      <main className="mx-auto max-w-7xl px-5 py-8 sm:px-6 sm:py-10">
        {/* Page header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <img src="/favicon.png" alt="Jenvu" className="h-7 w-7 rounded-md object-contain" />
            <div>
              <h1 className="text-[22px] font-semibold tracking-tight text-zinc-900">
                {active ? active.title : "Operations Hub"}
              </h1>
              <p className="mt-0.5 text-[13px] text-zinc-500">
                {active ? active.desc : "Internal tools · authorized personnel only."}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`flex items-center gap-1.5 ${MONO} text-[10px] uppercase tracking-[0.22em] text-emerald-600`}>
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
              live
            </span>
            {active && (
              <button
                onClick={() => setActive(null)}
                className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-3.5 py-1.5 text-[13px] text-zinc-700 transition hover:bg-zinc-50"
              >
                Back
              </button>
            )}
            <button
              onClick={onLock}
              className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-3.5 py-1.5 text-[13px] text-zinc-700 transition hover:bg-zinc-50"
            >
              Lock
            </button>
          </div>
        </div>

        {!active ? (
          /* Flat section list, dashboard style */
          <div className="mt-6 border-t border-zinc-200">
            {TILES.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setActive(t)}
                className="group flex w-full items-center justify-between gap-4 border-b border-zinc-200 px-1 py-4 text-left transition hover:bg-zinc-50"
              >
                <div className="min-w-0">
                  <div className="truncate text-[14px] font-medium text-zinc-900">{t.title}</div>
                  <div className="truncate text-[12.5px] text-zinc-500">{t.desc}</div>
                </div>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-zinc-400 transition group-hover:translate-x-0.5 group-hover:text-zinc-900">
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </button>
            ))}
          </div>
        ) : (
          /* Fullscreen embedded section */
          <div className="fixed inset-0 z-50 flex flex-col bg-white">
            <div className="flex items-center gap-3 border-b border-zinc-200 bg-white px-4 py-2.5">
              <button
                onClick={() => setActive(null)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm text-zinc-700 transition hover:border-zinc-300 hover:bg-zinc-50"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
                Back
              </button>
              <img src="/favicon.png" alt="Jenvu" className="h-6 w-6 rounded-md object-contain" />
              <div className="flex flex-col leading-tight">
                <span className="text-[13px] font-semibold text-zinc-900">{active.title}</span>
                <span className={`${MONO} text-[9px] uppercase tracking-[0.22em] text-zinc-400`}>{active.to}</span>
              </div>
              <div className="ml-auto flex items-center gap-2">
                <a
                  href={active.to}
                  target="_blank"
                  rel="noreferrer"
                  className={`${MONO} text-[10px] uppercase tracking-[0.22em] text-zinc-500 hover:text-zinc-900`}
                >
                  open in new tab ↗
                </a>
                <button
                  onClick={onLock}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm text-zinc-700 transition hover:border-zinc-300 hover:bg-zinc-50"
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
              className="h-full w-full flex-1 bg-white"
            />
          </div>
        )}

        {!active && (
          <p className={`${MONO} mt-8 text-center text-[10px] uppercase tracking-[0.22em] text-zinc-400`}>
            Sections open fullscreen inside the hub
          </p>
        )}
      </main>
    </div>
  );
}
