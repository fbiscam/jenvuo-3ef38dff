import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Check, Copy, Download, KeyRound, ShieldCheck, Target, TrendingUp, Bot } from "lucide-react";
import { Mt5Licenses, PlanLock, useMt5Access } from "@/components/dashboard/Mt5Licenses";
import { getBotDownloadUrl } from "@/lib/mt5-licenses.functions";
import { MT5_PLANS, dailyTarget, isMt5Plan } from "@/lib/mt5-licenses";

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

type Step = { title: string; items: string[]; code?: string };

const STEPS: Step[] = [
  { title: "Get your license", items: ["Enter your MT5 account number in the license panel (digits only) and create a license.", "Copy the key. It works only on that one account."], code: "JENV-XXXX-XXXX-XXXX-XXXX" },
  { title: "Install the bot", items: ["In MT5: File → Open Data Folder.", "Paste Jenvu EA.ex5 into MQL5 → Experts and the .set files into MQL5 → Presets.", "Navigator → Expert Advisors → right-click → Refresh."], code: "MQL5/Experts/Jenvu EA.ex5" },
  { title: "Allow the license check", items: ["Tools → Options → Expert Advisors.", "Tick “Allow WebRequest for listed URL”, add the address below and press OK."], code: "https://jenvu.com" },
  { title: "Run the bot", items: ["Turn on Algo Trading and open the XAUUSD M15 chart.", "Drag Jenvu EA onto the chart → Inputs → Load “Jenvu Xau M15 Exness.set”.", "Paste your key into LicenseKey and press OK. The Experts tab should show the line below."], code: "Jenvu license: VALID" },
];

function CodeLine({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="mt-3 flex items-center justify-between gap-2 rounded-md border border-gc-line bg-gc-console-search px-3 py-2">
      <code className="min-w-0 break-all font-mono text-[12px] text-gc-ink">{value}</code>
      <button
        type="button"
        aria-label="Copy"
        onClick={() => { void navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
        className="shrink-0 rounded p-1 text-gc-ink-muted hover:bg-card hover:text-gc-ink"
      >
        {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      </button>
    </div>
  );
}

function Stat({ icon: Icon, label, value, hint }: { icon: typeof Target; label: string; value: string; hint: string }) {
  return (
    <div className="rounded-lg border border-gc-line bg-card p-4">
      <div className="flex items-center gap-2 text-[12px] text-gc-ink-muted"><Icon className="h-4 w-4 text-gc-blue" />{label}</div>
      <p className="mt-2 text-[22px] font-normal tracking-tight text-gc-ink">{value}</p>
      <p className="text-[11px] text-gc-ink-muted">{hint}</p>
    </div>
  );
}

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
    } catch {
      toast.error("Download failed. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const plan = access && isMt5Plan(access.plan) ? access.plan : "pro";
  const active = access?.licenses.filter((l) => !l.revoked_at) ?? [];
  const bound = active.filter((l) => l.mt5_account).length;
  const lastCheck = active
    .map((l) => l.last_validated_at)
    .filter((d): d is string => !!d)
    .sort()
    .pop();

  return (
    <div className="w-full px-1 py-2 sm:px-2 sm:py-4">
      {/* Status banner */}
      <div className="rounded-lg border border-gc-line bg-card p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-gc-blue-soft text-gc-blue"><Bot className="h-5 w-5" /></span>
            <div>
              <h1 className="text-[24px] font-normal tracking-tight text-gc-ink">JX Bot</h1>
              <p className="text-[13px] text-gc-ink-muted">Jenvu's XAU/USD Expert Advisor for MetaTrader 5</p>
            </div>
          </div>
          {access?.allowed && (
            <button type="button" onClick={download} disabled={busy} className="inline-flex items-center gap-2 rounded-full bg-gc-blue px-5 py-2.5 text-[13px] font-medium text-gc-on-blue hover:opacity-90 disabled:opacity-60">
              <Download className="h-4 w-4" /> {busy ? "Preparing…" : "Download bot (.zip)"}
            </button>
          )}
        </div>
        <div className="mt-4 flex flex-wrap gap-2 font-mono text-[11px]">
          <span className="rounded-full border border-gc-line bg-gc-console-search px-2.5 py-1 text-gc-ink">XAUUSD · M15</span>
          <span className="rounded-full border border-gc-line bg-gc-console-search px-2.5 py-1 text-gc-ink">MetaTrader 5</span>
          {access && (
            <span className={`rounded-full px-2.5 py-1 ${access.allowed ? "bg-gc-green-soft text-gc-green" : "bg-gc-red-soft text-gc-red"}`}>
              ● {access.allowed ? "Plan active" : "Locked"}
            </span>
          )}
        </div>
      </div>

      {!access ? (
        <div className="mt-5 h-40 animate-pulse rounded-lg bg-gc-console-search" />
      ) : !access.allowed ? (
        <div className="mt-5"><PlanLock title="JX Bot" /></div>
      ) : (
        <>
          <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat icon={ShieldCheck} label="Active plan" value={MT5_PLANS[plan].name} hint={access.expiresAt ? `Renews ${new Date(access.expiresAt).toLocaleDateString()}` : "Monthly plan"} />
            <Stat icon={TrendingUp} label="Monthly target" value={`$${MT5_PLANS[plan].monthlyTarget.toLocaleString()}`} hint="Bot stops at this limit" />
            <Stat icon={Target} label="Daily target" value={`$${dailyTarget(plan)}`} hint="Pauses for the day" />
            <Stat icon={KeyRound} label="Licenses" value={`${bound}/${access.limit}`} hint="MT5 accounts linked" />
          </div>

          <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_380px]">
            <div className="space-y-3">
              {STEPS.map((s, i) => (
                <section key={s.title} className="rounded-lg border border-gc-line bg-card p-4 sm:p-5">
                  <div className="flex items-center gap-3">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gc-blue-soft font-mono text-[12px] font-medium text-gc-blue">{String(i + 1).padStart(2, "0")}</span>
                    <h2 className="text-[15px] font-medium text-gc-ink">{s.title}</h2>
                  </div>
                  <ul className="mt-2 list-disc space-y-1 pl-12 text-[13px] leading-relaxed text-gc-ink-muted">
                    {s.items.map((t) => <li key={t}>{t}</li>)}
                  </ul>
                  {s.code && <div className="pl-10"><CodeLine value={s.code} /></div>}
                </section>
              ))}

              <section className="rounded-lg border border-gc-line bg-card p-4 sm:p-5">
                <h2 className="text-[15px] font-medium text-gc-ink">If the license shows invalid</h2>
                <div className="mt-3 overflow-hidden rounded-md border border-gc-line bg-gc-console-search font-mono text-[12px]">
                  {[
                    ["server not reachable", "add https://jenvu.com to the WebRequest list"],
                    ["different MT5 account", "create a license for the account you're logged in to"],
                    ["expired", "renew your plan in Billing"],
                    ["not recognised", "copy the key again, with no spaces"],
                  ].map(([err, fix]) => (
                    <div key={err} className="flex flex-col gap-0.5 border-b border-gc-line px-3 py-2 last:border-b-0 sm:flex-row sm:gap-3">
                      <span className="shrink-0 text-gc-red sm:w-48">✕ {err}</span>
                      <span className="text-gc-ink-muted">→ {fix}</span>
                    </div>
                  ))}
                </div>
                <p className="mt-3 text-[12px] text-gc-ink-muted">Test on a demo account first. Trading involves risk; profit targets are limits the bot stops at, not promised results.</p>
              </section>
            </div>

            <div className="space-y-4">
              <Mt5Licenses />

              <section className="rounded-lg border border-gc-line bg-gc-console-search p-4">
                <h2 className="text-[13px] font-medium text-gc-ink">License status</h2>
                <div className="mt-2 space-y-1 font-mono text-[11.5px] leading-relaxed">
                  <p className="text-gc-ink-muted">$ jenvu license --status</p>
                  <p className="text-gc-ink">plan: {MT5_PLANS[plan].name.toLowerCase()}</p>
                  <p className="text-gc-ink">linked: {bound}/{access.limit}</p>
                  <p className={lastCheck ? "text-gc-green" : "text-gc-ink-muted"}>
                    {lastCheck ? `last VALID check: ${new Date(lastCheck).toLocaleString()}` : "waiting for first check from MT5…"}
                  </p>
                </div>
              </section>

              <section className="rounded-lg border border-gc-line bg-card p-4">
                <h2 className="text-[14px] font-medium text-gc-ink">Plans</h2>
                <table className="mt-2 w-full text-[12px]">
                  <thead><tr className="text-gc-ink-muted"><th className="py-1 text-left font-medium">Plan</th><th className="text-right font-medium">Monthly</th><th className="text-right font-medium">Daily</th><th className="text-right font-medium">Licenses</th></tr></thead>
                  <tbody>
                    {(Object.keys(MT5_PLANS) as (keyof typeof MT5_PLANS)[]).map((k) => (
                      <tr key={k} className={`border-t border-gc-line ${k === plan ? "font-medium text-gc-blue" : "text-gc-ink"}`}>
                        <td className="py-1.5">{MT5_PLANS[k].name}</td><td className="text-right">${MT5_PLANS[k].monthlyTarget.toLocaleString()}</td><td className="text-right">${dailyTarget(k)}</td><td className="text-right">{MT5_PLANS[k].licenses}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
