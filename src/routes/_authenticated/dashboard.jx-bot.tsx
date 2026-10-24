import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Download } from "lucide-react";
import { Mt5Licenses, PlanLock, useMt5Access } from "@/components/dashboard/Mt5Licenses";
import { getBotDownloadUrl } from "@/lib/mt5-licenses.functions";
import { MT5_PLANS, dailyTarget } from "@/lib/mt5-licenses";

export const Route = createFileRoute("/_authenticated/dashboard/jx-bot")({
  head: () => ({
    meta: [
      { title: "JX Bot for MT5 — Jenvu" },
      { name: "description", content: "Download the Jenvu JX Bot for MetaTrader 5, create your license and follow the install steps." },
      { property: "og:title", content: "JX Bot for MT5 — Jenvu" },
      { property: "og:description", content: "Download the JX Bot, link your MT5 account and start trading XAU/USD." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: JxBotPage,
});

const STEPS: [string, string[]][] = [
  ["Get your license", ["Enter your MT5 account number below (digits only) and create a license.", "Copy the key. It looks like JENV-XXXX-XXXX-XXXX-XXXX and works only on that account."]],
  ["Install the bot", ["In MT5: File → Open Data Folder → MQL5 → Experts. Paste the Jenvu EA file.", "Open MQL5 → Presets and paste the .set files.", "Navigator → Expert Advisors → right-click → Refresh."]],
  ["Allow the license check", ["Tools → Options → Expert Advisors.", "Tick “Allow WebRequest for listed URL”, add https://jenvu.com and press OK."]],
  ["Run the bot", ["Turn on Algo Trading.", "Open the XAUUSD M15 chart and drag Jenvu EA onto it.", "Inputs → Load → “Jenvu Xau M15 Exness.set”, paste your key into LicenseKey, press OK.", "The Experts tab should show “Jenvu license: VALID”."]],
];

function JxBotPage() {
  const { access } = useMt5Access();
  const getUrl = useServerFn(getBotDownloadUrl);
  const [busy, setBusy] = useState(false);

  const download = async () => {
    setBusy(true);
    try {
      const r = await getUrl();
      if (r.ok) window.location.href = r.url;
      else toast.error(r.error);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="w-full px-1 py-2 sm:px-2 sm:py-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[26px] font-normal tracking-tight text-gc-ink">JX Bot</h1>
          <p className="text-[13px] text-gc-ink-muted">Jenvu's XAU/USD Expert Advisor for MetaTrader 5.</p>
        </div>
        {access?.allowed && (
          <button type="button" onClick={download} disabled={busy} className="inline-flex items-center gap-2 rounded-full bg-gc-blue px-4 py-2 text-[13px] font-medium text-gc-on-blue disabled:opacity-60">
            <Download className="h-4 w-4" /> {busy ? "Preparing…" : "Download bot"}
          </button>
        )}
      </div>

      {!access ? (
        <div className="mt-6 h-40 animate-pulse rounded-lg bg-gc-console-search" />
      ) : !access.allowed ? (
        <div className="mt-6"><PlanLock title="JX Bot" /></div>
      ) : (
        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_380px]">
          <div className="space-y-4">
            {STEPS.map(([title, items], i) => (
              <section key={title} className="rounded-lg border border-gc-line bg-card p-4 sm:p-5">
                <h2 className="text-[15px] font-medium text-gc-ink">{i + 1}. {title}</h2>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-[13px] leading-relaxed text-gc-ink-muted">
                  {items.map((t) => <li key={t}>{t}</li>)}
                </ul>
              </section>
            ))}
            <section className="rounded-lg border border-gc-line bg-card p-4 sm:p-5">
              <h2 className="text-[15px] font-medium text-gc-ink">If the license shows invalid</h2>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-[13px] text-gc-ink-muted">
                <li>“server not reachable”: add https://jenvu.com to the WebRequest list.</li>
                <li>“different MT5 account”: create a license for the account you're logged in to.</li>
                <li>“expired”: renew your plan in Billing.</li>
                <li>“not recognised”: copy the key again, with no spaces.</li>
              </ul>
              <p className="mt-3 text-[12px] text-gc-ink-muted">Test on a demo account first. Trading involves risk; profit targets are limits the bot stops at, not promised results.</p>
            </section>
          </div>
          <div className="space-y-4">
            <Mt5Licenses />
            <section className="rounded-lg border border-gc-line bg-card p-4">
              <h2 className="text-[14px] font-medium text-gc-ink">Plans</h2>
              <table className="mt-2 w-full text-[12px]">
                <thead><tr className="text-gc-ink-muted"><th className="py-1 text-left font-medium">Plan</th><th className="text-right font-medium">Monthly</th><th className="text-right font-medium">Daily</th><th className="text-right font-medium">Licenses</th></tr></thead>
                <tbody>
                  {(Object.keys(MT5_PLANS) as (keyof typeof MT5_PLANS)[]).map((k) => (
                    <tr key={k} className="border-t border-gc-line text-gc-ink"><td className="py-1.5">{MT5_PLANS[k].name}</td><td className="text-right">${MT5_PLANS[k].monthlyTarget.toLocaleString()}</td><td className="text-right">${dailyTarget(k)}</td><td className="text-right">{MT5_PLANS[k].licenses}</td></tr>
                  ))}
                </tbody>
              </table>
            </section>
          </div>
        </div>
      )}
    </div>
  );
}
