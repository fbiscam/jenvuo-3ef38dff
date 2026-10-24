import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  Bot,
  CalendarClock,
  Check,
  CircleStop,
  Copy,
  Download,
  FileArchive,
  FileCode2,
  FileText,
  KeyRound,
  PauseCircle,
  ShieldCheck,
  SlidersHorizontal,
  Target,
  TrendingUp,
} from "lucide-react";
import { Mt5Licenses, PlanLock, useMt5Access } from "@/components/dashboard/Mt5Licenses";
import { getBotDownloadUrl } from "@/lib/mt5-licenses.functions";
import { MT5_PLANS, dailyTarget, isMt5Plan } from "@/lib/mt5-licenses";
import { cn } from "@/lib/utils";

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

type Step = { tag: string; title: string; items: string[]; code?: string };

const STEPS: Step[] = [
  { tag: "LICENSE", title: "Get your license", items: ["Enter your MT5 account number in the license panel (digits only) and create a license.", "Copy the key. It works only on that one account."], code: "JENV-XXXX-XXXX-XXXX-XXXX" },
  { tag: "INSTALL", title: "Install the bot", items: ["In MT5: File → Open Data Folder.", "Paste Jenvu EA.ex5 into MQL5 → Experts and the .set files into MQL5 → Presets.", "Navigator → Expert Advisors → right-click → Refresh."], code: "MQL5/Experts/Jenvu EA.ex5" },
  { tag: "NETWORK", title: "Allow the license check", items: ["Tools → Options → Expert Advisors.", "Tick “Allow WebRequest for listed URL”, add the address below and press OK."], code: "https://jenvu.com" },
  { tag: "RUN", title: "Run the bot", items: ["Turn on Algo Trading and open the XAUUSD M15 chart.", "Drag Jenvu EA onto the chart → Inputs → Load “Jenvu Xau M15 Exness.set”.", "Paste your key into LicenseKey and press OK. The Experts tab should show the line below."], code: "Jenvu license: VALID" },
];

/** High-level behaviour only — the trading logic itself is proprietary and not shown. */
const HOW = [
  { icon: ShieldCheck, title: "License check", text: "On start the bot checks its key with jenvu.com. It trades only while the key and your plan are valid." },
  { icon: TrendingUp, title: "Trades gold on M15", text: "Runs on the XAUUSD M15 chart of the MT5 account the key is linked to." },
  { icon: PauseCircle, title: "Daily auto-stop", text: "Pauses for the rest of the day once your plan's daily target is reached." },
  { icon: CircleStop, title: "Monthly limit", text: "Stops when the monthly target of your plan is reached, until the next period." },
];

const PACKAGE = [
  { icon: FileCode2, name: "Jenvu EA.ex5", note: "The bot for MQL5 → Experts" },
  { icon: SlidersHorizontal, name: "Jenvu Xau M15 Exness.set", note: "Main preset for XAUUSD M15" },
  { icon: SlidersHorizontal, name: "Jenvu Low Risk.set", note: "Lower-risk preset" },
  { icon: FileText, name: "Jenvu Manual.pdf", note: "Full user manual" },
  { icon: FileArchive, name: "README_INSTALL.txt", note: "Quick install notes" },
];

const ERRORS = [
  ["server not reachable", "add https://jenvu.com to the WebRequest list"],
  ["different MT5 account", "create a license for the account you're logged in to"],
  ["expired", "renew your plan in Billing"],
  ["not recognised", "copy the key again, with no spaces"],
];

function CodeLine({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="mt-3 flex items-center justify-between gap-2 rounded-md border border-gc-line bg-gc-console-search px-3 py-2">
      <code className="min-w-0 break-all font-mono text-[12px] text-gc-ink">{value}</code>
      <button
        type="button"
        aria-label="Copy"
        onClick={() => {
          void navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }}
        className="shrink-0 rounded p-1 text-gc-ink-muted hover:bg-card hover:text-gc-ink"
      >
        {copied ? <Check className="h-3.5 w-3.5 text-gc-green" /> : <Copy className="h-3.5 w-3.5" />}
      </button>
    </div>
  );
}

function Meter({ value }: { value: number }) {
  return (
    <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-gc-console-search">
      <div className="h-full rounded-full bg-gc-blue" style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  );
}

function Stat({ icon: Icon, label, value, hint, tag, meter }: { icon: typeof Target; label: string; value: string; hint: string; tag?: string; meter?: number }) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-gc-line bg-card p-4 sm:p-5">
      <span aria-hidden className="absolute inset-x-0 top-0 h-1 bg-gc-blue" />
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-2 text-[12px] font-medium text-gc-ink-muted">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-gc-blue-soft text-gc-blue"><Icon className="h-4 w-4" /></span>
          {label}
        </span>
        {tag && <span className="rounded-full bg-gc-green-soft px-2 py-0.5 font-mono text-[10px] font-medium text-gc-green">{tag}</span>}
      </div>
      <p className="mt-3 text-[26px] font-medium leading-none tracking-tight text-gc-ink">{value}</p>
      <p className="mt-1.5 text-[11.5px] text-gc-ink-muted">{hint}</p>
      {meter !== undefined && <Meter value={meter} />}
    </div>
  );
}

function SectionTitle({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="mb-3">
      <p className="font-mono text-[10.5px] font-medium tracking-[0.14em] text-gc-blue">{eyebrow}</p>
      <h2 className="mt-1 text-[17px] font-medium text-gc-ink">{title}</h2>
    </div>
  );
}

function HowItWorks() {
  return (
    <section className="rounded-xl border border-gc-line bg-card p-4 sm:p-5">
      <SectionTitle eyebrow="OVERVIEW" title="How JX Bot works" />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {HOW.map(({ icon: Icon, title, text }, i) => (
          <div key={title} className="rounded-lg border border-gc-line bg-gc-console-search/60 p-4">
            <div className="flex items-center justify-between">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-card text-gc-blue shadow-sm"><Icon className="h-4.5 w-4.5" /></span>
              <span className="font-mono text-[11px] text-gc-ink-muted">0{i + 1}</span>
            </div>
            <h3 className="mt-3 text-[14px] font-medium text-gc-ink">{title}</h3>
            <p className="mt-1 text-[12.5px] leading-relaxed text-gc-ink-muted">{text}</p>
          </div>
        ))}
      </div>
      <p className="mt-3 text-[11.5px] text-gc-ink-muted">How the bot picks its trades is proprietary, so its strategy and settings values are not published.</p>
    </section>
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
  const limit = access?.limit ?? 0;
  const lastCheck = active
    .map((l) => l.last_validated_at)
    .filter((d): d is string => !!d)
    .sort()
    .pop();
  const daysLeft = access?.expiresAt ? Math.max(0, Math.ceil((Date.parse(access.expiresAt) - Date.now()) / 86_400_000)) : null;

  return (
    <div className="keep-case w-full px-1 py-2 sm:px-2 sm:py-4" data-page="jx-bot">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-xl border border-gc-line bg-card">
        <span aria-hidden className="absolute inset-x-0 top-0 h-1 bg-gc-blue" />
        <div className="grid gap-6 p-5 sm:p-7 lg:grid-cols-[1fr_360px] lg:items-center">
          <div>
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-gc-blue text-gc-on-blue"><Bot className="h-6 w-6" /></span>
              <div>
                <p className="font-mono text-[10.5px] font-medium tracking-[0.14em] text-gc-blue">EXPERT ADVISOR · METATRADER 5</p>
                <h1 className="text-[28px] font-medium leading-tight tracking-tight text-gc-ink sm:text-[32px]">JX Bot</h1>
              </div>
            </div>
            <p className="mt-3 max-w-xl text-[14px] leading-relaxed text-gc-ink-muted">
              Jenvu's automated XAU/USD trader for MT5. Link it to your account with a license key, and it stops on its own at your plan's daily and monthly targets.
            </p>
            <div className="mt-4 flex flex-wrap gap-2 font-mono text-[11px]">
              <span className="rounded-full border border-gc-line bg-gc-console-search px-2.5 py-1 text-gc-ink">XAUUSD · M15</span>
              <span className="rounded-full border border-gc-line bg-gc-console-search px-2.5 py-1 text-gc-ink">MetaTrader 5</span>
              <span className="rounded-full border border-gc-line bg-gc-console-search px-2.5 py-1 text-gc-ink">Daily auto-stop</span>
              {access && (
                <span className={cn("rounded-full px-2.5 py-1", access.allowed ? "bg-gc-green-soft text-gc-green" : "bg-gc-red-soft text-gc-red")}>
                  ● {access.allowed ? "Plan active" : "Locked"}
                </span>
              )}
            </div>
            {access?.allowed && (
              <div className="mt-5 flex flex-wrap items-center gap-3">
                <button type="button" onClick={download} disabled={busy} className="inline-flex items-center gap-2 rounded-full bg-gc-blue px-6 py-3 text-[14px] font-medium text-gc-on-blue shadow-sm hover:opacity-90 disabled:opacity-60">
                  <Download className="h-4 w-4" /> {busy ? "Preparing…" : "Download bot (.zip)"}
                </button>
                <span className="font-mono text-[11px] text-gc-ink-muted">.ex5 · 2 presets · manual</span>
              </div>
            )}
          </div>

          {/* Status console */}
          <div className="rounded-lg border border-gc-line bg-gc-console-search p-4 font-mono text-[12px] leading-relaxed">
            <div className="mb-2 flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-gc-red" />
              <span className="h-2.5 w-2.5 rounded-full bg-gc-yellow" />
              <span className="h-2.5 w-2.5 rounded-full bg-gc-green" />
              <span className="ml-2 text-[11px] text-gc-ink-muted">jenvu license --status</span>
            </div>
            {!access ? (
              <p className="text-gc-ink-muted">loading…</p>
            ) : (
              <>
                <p className="text-gc-ink"><span className="text-gc-ink-muted">plan&nbsp;&nbsp;&nbsp;&nbsp;</span>{access.allowed ? MT5_PLANS[plan].name.toLowerCase() : "none"}</p>
                <p className="text-gc-ink"><span className="text-gc-ink-muted">linked&nbsp;&nbsp;</span>{bound}/{limit}</p>
                <p className="text-gc-ink"><span className="text-gc-ink-muted">daily&nbsp;&nbsp;&nbsp;</span>{access.allowed ? `$${dailyTarget(plan)}` : "—"}</p>
                <p className={lastCheck ? "text-gc-green" : "text-gc-ink-muted"}>
                  {lastCheck ? `✓ last VALID check ${new Date(lastCheck).toLocaleString()}` : access.allowed ? "… waiting for first check from MT5" : "✕ needs a paid plan"}
                </p>
              </>
            )}
          </div>
        </div>
      </section>

      {!access ? (
        <div className="mt-5 h-40 animate-pulse rounded-xl bg-gc-console-search" />
      ) : !access.allowed ? (
        <div className="mt-5 space-y-5">
          <HowItWorks />
          <PlanLock title="JX Bot" />
        </div>
      ) : (
        <>
          <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat icon={ShieldCheck} label="Active plan" value={MT5_PLANS[plan].name} hint={access.expiresAt ? `Renews ${new Date(access.expiresAt).toLocaleDateString()}` : "Monthly plan"} meter={daysLeft !== null ? (daysLeft / 30) * 100 : undefined} />
            <Stat icon={Target} label="Daily target" value={`$${dailyTarget(plan)}`} hint="Bot pauses for the day" tag="AUTO-STOP" />
            <Stat icon={CalendarClock} label="Monthly target" value={`$${MT5_PLANS[plan].monthlyTarget.toLocaleString()}`} hint="Bot stops at this limit" />
            <Stat icon={KeyRound} label="Licenses" value={`${bound}/${limit}`} hint="MT5 accounts linked" meter={limit ? (bound / limit) * 100 : 0} />
          </div>

          <div className="mt-5"><HowItWorks /></div>

          <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_380px]">
            <div className="space-y-3">
              <div className="rounded-xl border border-gc-line bg-card p-4 sm:p-5">
                <SectionTitle eyebrow="SETUP" title="Install in four steps" />
                <div className="space-y-3">
                  {STEPS.map((s, i) => (
                    <section key={s.title} className="rounded-lg border border-gc-line p-4">
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gc-blue font-mono text-[12px] font-medium text-gc-on-blue">{String(i + 1).padStart(2, "0")}</span>
                        <h3 className="text-[15px] font-medium text-gc-ink">{s.title}</h3>
                        <span className="ml-auto font-mono text-[10.5px] tracking-[0.12em] text-gc-ink-muted">{s.tag}</span>
                      </div>
                      <ul className="mt-2 list-disc space-y-1 pl-[60px] text-[13px] leading-relaxed text-gc-ink-muted">
                        {s.items.map((t) => <li key={t}>{t}</li>)}
                      </ul>
                      {s.code && <div className="sm:pl-11"><CodeLine value={s.code} /></div>}
                    </section>
                  ))}
                </div>
              </div>

              <section className="rounded-xl border border-gc-line bg-card p-4 sm:p-5">
                <SectionTitle eyebrow="TROUBLESHOOTING" title="If the license shows invalid" />
                <div className="overflow-hidden rounded-md border border-gc-line bg-gc-console-search font-mono text-[12px]">
                  {ERRORS.map(([err, fix]) => (
                    <div key={err} className="flex flex-col gap-0.5 border-b border-gc-line px-3 py-2 last:border-b-0 sm:flex-row sm:gap-3">
                      <span className="shrink-0 text-gc-red sm:w-48">✕ {err}</span>
                      <span className="text-gc-ink-muted">→ {fix}</span>
                    </div>
                  ))}
                </div>
                <p className="mt-3 text-[12px] text-gc-ink-muted">Start with a small lot size. Trading involves risk; profit targets are limits the bot stops at, not promised results.</p>
              </section>
            </div>

            <div className="space-y-4">
              <Mt5Licenses />

              <section className="rounded-xl border border-gc-line bg-card p-4">
                <SectionTitle eyebrow="PACKAGE" title="What's in the download" />
                <ul className="divide-y divide-gc-line">
                  {PACKAGE.map(({ icon: Icon, name, note }) => (
                    <li key={name} className="flex items-center gap-3 py-2">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-gc-blue-soft text-gc-blue"><Icon className="h-4 w-4" /></span>
                      <span className="min-w-0">
                        <span className="block truncate font-mono text-[12px] text-gc-ink">{name}</span>
                        <span className="block text-[11.5px] text-gc-ink-muted">{note}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </section>

              <section className="rounded-xl border border-gc-line bg-card p-4">
                <SectionTitle eyebrow="PLANS" title="Targets and licenses" />
                <table className="w-full text-[12px]">
                  <thead><tr className="text-gc-ink-muted"><th className="py-1 text-left font-medium">Plan</th><th className="text-right font-medium">Monthly</th><th className="text-right font-medium">Daily</th><th className="text-right font-medium">Licenses</th></tr></thead>
                  <tbody>
                    {(Object.keys(MT5_PLANS) as (keyof typeof MT5_PLANS)[]).map((k) => (
                      <tr key={k} className={cn("border-t border-gc-line", k === plan ? "font-medium text-gc-blue" : "text-gc-ink")}>
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
