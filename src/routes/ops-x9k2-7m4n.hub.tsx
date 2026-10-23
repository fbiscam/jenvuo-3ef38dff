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
  { key: "audit", title: "Scan Audit", desc: "AI cost & scan ledger", to: "/dashboard/admin/scan-audit" },
  { key: "accuracy", title: "Accuracy Dashboard", desc: "Paper-trade win rate & drift", to: "/dashboard/admin/accuracy" },
  { key: "tuning", title: "Weight Tuning", desc: "Grid search & walk-forward configs", to: "/dashboard/admin/tuning" },
  { key: "tvmm", title: "TV Mismatch Checker", desc: "Signal chart price drift audit", to: "/dashboard/admin/tv-mismatch" },
  
  { key: "payments", title: "Payments & Promos", desc: "Crypto top-ups, approvals & promo codes", to: "/ops-x9k2-7m4n/payments" },


];

const TONES = ["bg-gc-sky text-gc-blue-deep", "bg-gc-green-soft text-gc-success", "bg-gc-yellow-soft text-gc-ink", "bg-gc-red-soft text-gc-red"];

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
    return <div className="min-h-dvh w-full bg-gc-canvas" />;
  }

  return (
    <div className={`min-h-dvh w-full bg-gc-canvas text-gc-ink ${SANS} antialiased`}>
      <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-gc-line bg-background px-4 sm:px-6">
        <img src="/favicon.png" alt="Jenvu" className="h-6 w-6 rounded-md object-contain" />
        <span className="text-[20px] font-medium tracking-tight text-gc-ink">Jenvu</span>
        <span className="rounded-full bg-gc-sky px-2.5 py-0.5 text-[12px] font-medium text-gc-blue-deep">Ops console</span>
        <span className="ml-auto hidden items-center gap-1.5 text-[12px] text-gc-success sm:flex">
          <span className="h-2 w-2 animate-pulse rounded-full bg-gc-green" /> Live
        </span>
        <button onClick={onLock} className="inline-flex h-9 items-center gap-1.5 rounded-full border border-gc-line bg-background px-4 text-[13px] font-medium text-gc-blue-deep transition hover:bg-gc-sky">
          Lock
        </button>
      </header>
      <main className="mx-auto max-w-6xl px-5 py-10 sm:px-6">
        <p className="text-[13px] font-medium text-gc-ink-muted">Restricted · authorized team only</p>
        <h1 className="mt-2 text-[32px] font-normal leading-tight text-gc-ink sm:text-[40px]">Operations hub</h1>
        <p className="mt-2 max-w-2xl text-[15px] text-gc-ink-muted">Every internal tool in one place. Pick a section to open it full screen.</p>

        {!active ? (
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {TILES.map((t, i) => {
              const tone = TONES[i % TONES.length];
              return (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setActive(t)}
                  className="group flex flex-col rounded-2xl border border-gc-line bg-background p-5 text-left transition-all duration-300 hover:-translate-y-0.5 hover:border-gc-blue-soft hover:shadow-lg"
                >
                  <span className={`grid h-10 w-10 place-items-center rounded-full text-[15px] font-medium ${tone}`}>{t.title.charAt(0)}</span>
                  <div className="mt-4 text-[16px] font-medium text-gc-ink">{t.title}</div>
                  <div className="mt-1 text-[13px] text-gc-ink-muted">{t.desc}</div>
                  <span className="mt-4 inline-flex items-center gap-1 text-[13px] font-medium text-gc-blue-deep">
                    Open
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="transition group-hover:translate-x-0.5"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
                  </span>
                </button>
              );
            })}
          </div>
        ) : (
          /* Fullscreen embedded section */
          <div className="fixed inset-0 z-50 flex flex-col bg-background">
            <div className="flex items-center gap-3 border-b border-gc-line bg-background px-4 py-2.5">
              <button
                onClick={() => setActive(null)}
                className="inline-flex items-center gap-1.5 rounded-full border border-gc-line bg-background px-3 py-1.5 text-sm text-gc-blue-deep transition hover:bg-gc-sky"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
                Back
              </button>
              <img src="/favicon.png" alt="Jenvu" className="h-6 w-6 rounded-md object-contain" />
              <div className="flex flex-col leading-tight">
                <span className="text-[13px] font-semibold text-gc-ink">{active.title}</span>
                <span className={`${MONO} text-[9px] uppercase tracking-[0.22em] text-gc-ink-muted`}>{active.to}</span>
              </div>
              <div className="ml-auto flex items-center gap-2">
                <a
                  href={active.to}
                  target="_blank"
                  rel="noreferrer"
                  className={`${MONO} text-[10px] uppercase tracking-[0.22em] text-gc-ink-muted hover:text-gc-ink`}
                >
                  open in new tab ↗
                </a>
                <button
                  onClick={onLock}
                  className="inline-flex items-center gap-1.5 rounded-full border border-gc-line bg-background px-3 py-1.5 text-sm text-gc-blue-deep transition hover:bg-gc-sky"
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
