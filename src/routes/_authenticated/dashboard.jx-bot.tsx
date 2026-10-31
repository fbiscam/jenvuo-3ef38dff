import { ConfirmDialog } from "@/components/ConfirmDialog";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Bot, Check, Copy, Download, FileText, Plus, Trash2, Wrench, X } from "lucide-react";
import { useMt5Access } from "@/components/dashboard/Mt5Licenses";
import { createMt5License, getBotDownloadUrl, revokeMt5License, type Mt5LicenseRow } from "@/lib/mt5-licenses.functions";
import { MT5_PLANS, countIpLicenses, dailyTarget, isMt5Plan, parseBinding } from "@/lib/mt5-licenses";

const MONO = "font-sans";

export const Route = createFileRoute("/_authenticated/dashboard/jx-bot")({
  head: () => ({
    meta: [
      { title: "JX Bot for MT5 — Jenvu" },
      { name: "description", content: "Download the Jenvu JX Bot for MetaTrader 5, add your IP and follow the install steps." },
      { property: "og:title", content: "JX Bot for MT5 — Jenvu" },
      { property: "og:description", content: "Download the JX Bot, register your PC or RDP IP address and start trading EUR/USD." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: JxBotPage,
});

const STEPS: { title: string; text: string; code?: string }[] = [
  { title: "Add your IP", text: "On the PC or RDP that runs MT5, open whatismyip.com, then click Add IP here and enter that IP address.", code: "203.0.113.25" },
  { title: "Install the bot", text: "In MT5: File → Open Data Folder. Put Jenvu EA.ex5 in MQL5 → Experts and the .set files in MQL5 → Presets, then refresh the Navigator.", code: "MQL5/Experts/Jenvu EA.ex5" },
  { title: "Allow the IP check", text: "Tools → Options → Expert Advisors → tick “Allow WebRequest for listed URL” and add this address.", code: "https://jenvu.com" },
  { title: "Run the bot", text: "Turn on Algo Trading, open EURUSD M15, drag Jenvu EA onto the chart, load “Jenvu EURUSD 15M.set” (load it again after every update) and type the same IP into MyIP.", code: "Jenvu license: VALID" },
];

const ERRORS = [
  ["server not reachable", "add https://jenvu.com to the WebRequest list"],
  ["different MT5 account", "each IP works with one MT5 account only (the first one that ran on it)"],
  ["IP does not match", "the IP in MyIP must match this PC/RDP's real IP and the one added here"],
  ["expired", "renew your plan in Billing"],
  ["not recognised", "add the IP on this page first, then type it in MyIP with no spaces"],
];

const HOW = [
  ["IP check", "On start the bot checks your IP with jenvu.com and trades only while the IP matches and the plan is valid."],
  ["EUR/USD on M15", "Runs on the EURUSD M15 chart; one IP works with one MT5 account."],
  ["Daily auto-stop", "Pauses for the day at your plan's daily target or 4% of the balance, whichever is lower; 4.7% drawdown guard."],
  ["Safe trading hours", "New trades Mon–Thu 01:00–14:00 and Fri until 13:00 (broker time); skips London and New York opens and weekends."],
  ["Entry checks", "Follows the H1 trend and skips wide spreads, weak candles and spikes, so some days have fewer trades."],
  ["Monthly limit", "Stops at your plan's monthly target until the next period."],
];

const fmtDate = (d: string) => new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });

function JxBotPage() {
  const { access, refresh } = useMt5Access();
  const getUrl = useServerFn(getBotDownloadUrl);
  const create = useServerFn(createMt5License);
  const revoke = useServerFn(revokeMt5License);

  const [downloading, setDownloading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [showFix, setShowFix] = useState(false);
  const [account, setAccount] = useState("");
  const [creating, setCreating] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<Mt5LicenseRow | null>(null);
  const [revoking, setRevoking] = useState(false);

  const loading = !access;
  const plan = access && isMt5Plan(access.plan) ? access.plan : "pro";
  const licenses = [...(access?.licenses ?? [])].sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
  const active = licenses.filter((l) => !l.revoked_at);
  const bound = countIpLicenses(licenses);
  const limit = access?.limit ?? 0;
  const canCreate = Boolean(access?.allowed && bound < limit);

  const copyValue = async (value: string, id: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(id);
      toast.success("Copied");
      setTimeout(() => setCopied(null), 1800);
    } catch {
      toast.error("Copy failed");
    }
  };

  const onDownload = async () => {
    setDownloading(true);
    try {
      const r = await getUrl();
      if (r.ok) {
        const res = await fetch(r.url);
        if (!res.ok) throw new Error("fetch failed");
        const blob = await res.blob();
        const href = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = href;
        a.download = "JX-Bot-MT5.zip";
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(href), 30_000);
      }
      else toast.error(r.error);
    } catch {
      toast.error("Download failed. Please try again.");
    } finally {
      setDownloading(false);
    }
  };

  const onCreate = async () => {
    setCreating(true);
    try {
      const r = await create({ data: { ip: account.trim() } });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success("IP added");
      setAccount("");
      setShowCreate(false);
      await refresh();
    } catch {
      toast.error("Enter a valid IP address, e.g. 203.0.113.25");
    } finally {
      setCreating(false);
    }
  };

  const onRevoke = async () => {
    if (!revokeTarget) return;
    setRevoking(true);
    try {
      await revoke({ data: { id: revokeTarget.id } });
      toast.success("IP deleted");
      setRevokeTarget(null);
      await refresh();
    } catch {
      toast.error("Could not delete the license");
    } finally {
      setRevoking(false);
    }
  };

  const statusBadge = (revoked: boolean) => (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[12px] font-medium ${revoked ? "bg-red-500/10 text-red-600 dark:text-red-400" : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${revoked ? "bg-red-500" : "bg-emerald-500"}`} />
      {revoked ? "Revoked" : "Active"}
    </span>
  );

  const stats = access
    ? [
        { label: "Plan", value: access.allowed ? MT5_PLANS[plan].name : "No plan" },
        { label: "Linked IPs", value: `${bound} / ${limit}` },
        { label: "Daily target", value: access.allowed ? `$${(access.dailyTarget || dailyTarget(plan)).toLocaleString()}` : "—" },
        { label: "Monthly target", value: access.allowed ? `$${(access.monthlyTarget || MT5_PLANS[plan].monthlyTarget).toLocaleString()}` : "—" },
      ]
    : [];

  return (
    <div className="keep-case mx-auto w-full max-w-[1100px] pb-10 text-foreground" data-page="jx-bot">
      {/* Header row */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-[28px] font-medium tracking-tight text-foreground sm:text-[32px]">JX Bot</h1>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={() => setShowGuide((v) => !v)} className="console-pill hidden sm:inline-flex">
            <FileText className="h-4 w-4" /> Install guide
          </button>
          <button onClick={() => setShowFix((v) => !v)} className="console-pill hidden sm:inline-flex">
            <Wrench className="h-4 w-4" /> Troubleshooting
          </button>
          <button onClick={onDownload} disabled={!access?.allowed || downloading} className="console-pill disabled:cursor-not-allowed disabled:opacity-45">
            <Download className="h-4 w-4" /> {downloading ? "Preparing…" : "Download bot"}
          </button>
          <button onClick={() => setShowCreate(true)} disabled={!canCreate} className="console-pill console-pill-solid disabled:cursor-not-allowed disabled:opacity-45">
            <Plus className="h-4 w-4" /> Add IP
          </button>
        </div>
      </div>
      <p className="mt-2 text-[14px] text-muted-foreground">MetaTrader 5 bot · one IP works with one MT5 account.</p>

      {access && (
        <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="console-card px-5 py-4">
              <div className="text-[13px] text-muted-foreground">{s.label}</div>
              <div className="mt-1.5 text-[22px] font-medium tabular-nums tracking-tight text-foreground">{s.value}</div>
            </div>
          ))}
        </div>
      )}

      {access && !access.allowed && (
        <div className="console-card mt-4 flex flex-wrap items-center justify-between gap-3 px-5 py-4 text-[14px] text-foreground">
          <span>JX Bot is included with Pro, Elite or Ultra, and free for 14 days with the free trial. Credit alone does not unlock it.</span>
          <Link to="/dashboard/billing" className="console-pill console-pill-solid">Buy now</Link>
        </div>
      )}

      {/* Install guide drawer */}
      {showGuide && (
        <div className="console-card mt-6 p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="text-[16px] font-medium text-foreground">Install guide</div>
            <button onClick={() => setShowGuide(false)} aria-label="Close install guide" className="rounded-full p-1 text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>
          <ol className="mt-4 space-y-4 text-[14px] leading-relaxed text-muted-foreground">
            {STEPS.map((s, i) => (
              <li key={s.title} className="flex gap-3">
                <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-foreground text-[12px] font-medium text-background">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-foreground">{s.title}</div>
                  <div className="mt-0.5">{s.text}</div>
                  {s.code && (
                    <div className="mt-2 flex items-center gap-2">
                      <code className={`${MONO} min-w-0 flex-1 truncate rounded-lg border border-gc-line bg-background px-3 py-2 text-[13px] text-foreground`}>{s.code}</code>
                      <button type="button" onClick={() => copyValue(s.code!, `step-${i}`)} className="console-pill shrink-0">
                        {copied === `step-${i}` ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />} Copy
                      </button>
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* Troubleshooting drawer */}
      {showFix && (
        <div className="console-card mt-6 p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="text-[16px] font-medium text-foreground">If the IP check fails</div>
            <button onClick={() => setShowFix(false)} aria-label="Close troubleshooting" className="rounded-full p-1 text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-4 divide-y divide-gc-line rounded-xl border border-gc-line bg-background text-[13px]">
            {ERRORS.map(([err, fix]) => (
              <div key={err} className="flex flex-col gap-0.5 px-4 py-2.5 sm:flex-row sm:gap-3">
                <span className="shrink-0 text-red-600 dark:text-red-400 sm:w-52">{err}</span>
                <span className="text-muted-foreground">{fix}</span>
              </div>
            ))}
          </div>
          <p className="mt-3 text-[13px] text-muted-foreground">Start with a small lot size. Targets are limits the bot stops at, not promised results.</p>
        </div>
      )}

      {/* IP list (API Keys table style) */}
      <div className="mt-8">
        <div className="flex items-end justify-between gap-3">
          <h2 className="text-[20px] font-medium tracking-tight text-foreground">Your IP addresses</h2>
          <span className="shrink-0 text-[13px] tabular-nums text-muted-foreground">{active.length} active · {bound} of {limit} used</span>
        </div>

        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-[14px]">
            <thead>
              <tr className="text-[13px] text-muted-foreground">
                <th className="py-3 pr-4 font-normal">IP address</th>
                <th className="py-3 pr-4 font-normal">MT5 account</th>
                <th className="py-3 pr-4 font-normal">Created</th>
                <th className="py-3 pr-4 font-normal">Last check</th>
                <th className="py-3 pr-4 font-normal">Status</th>
                <th className="w-12 py-3" />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="py-10 text-center text-muted-foreground">Loading…</td></tr>
              ) : licenses.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-14 text-center">
                    <Bot className="mx-auto h-10 w-10 text-muted-foreground" strokeWidth={1.25} />
                    <div className="mt-4 text-[15px] font-medium text-foreground">No IPs yet</div>
                    <p className="mx-auto mt-1 max-w-md text-[14px] text-muted-foreground">Add the IP of your PC or RDP, download the bot and type the same IP in MyIP.</p>
                    <button onClick={() => setShowCreate(true)} disabled={!canCreate} className="console-pill console-pill-solid mt-5 disabled:cursor-not-allowed disabled:opacity-45">
                      <Plus className="h-4 w-4" /> Add IP
                    </button>
                  </td>
                </tr>
              ) : (
                licenses.map((l) => {
                  const b = parseBinding(l.mt5_account);
                  return (
                    <tr key={l.id} className="console-row">
                      <td className="py-3.5 pr-4">
                        <span className="inline-flex items-center gap-1.5">
                          <code className={`${MONO} text-[14px] font-medium text-foreground`}>{b.ip ?? "No IP yet"}</code>
                          {!l.revoked_at && b.ip && (
                            <button type="button" aria-label="Copy IP address" onClick={() => copyValue(b.ip ?? "", l.id)} className="rounded p-1 text-muted-foreground hover:text-foreground">
                              {copied === l.id ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                            </button>
                          )}
                        </span>
                        <div className="text-[12px] text-muted-foreground">{MT5_PLANS[isMt5Plan(l.plan_id) ? l.plan_id : "pro"].name} plan</div>
                      </td>
                      <td className="py-3.5 pr-4">
                        {b.account ? <span className={`${MONO} text-foreground`}>{b.account}</span> : <span className="text-muted-foreground">Locks to the first account</span>}
                      </td>
                      <td className="py-3.5 pr-4 text-foreground">{fmtDate(l.created_at)}</td>
                      <td className="py-3.5 pr-4 text-muted-foreground">{l.last_validated_at ? new Date(l.last_validated_at).toLocaleDateString() : "Never"}</td>
                      <td className="py-3.5 pr-4">{statusBadge(Boolean(l.revoked_at))}</td>
                      <td className="py-3.5 text-right">
                        <button type="button" title="Delete IP" aria-label="Delete IP" onClick={() => setRevokeTarget(l)} className="rounded-full p-2 text-muted-foreground hover:text-red-600">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* How it works + plans */}
      <div className="mt-8 grid gap-4 lg:grid-cols-[1fr_380px]">
        <div className="console-card p-5">
          <h2 className="text-[16px] font-medium text-foreground">How JX Bot works</h2>
          <div className="mt-3 divide-y divide-gc-line">
            {HOW.map(([t, d]) => (
              <div key={t} className="grid gap-1 py-3 sm:grid-cols-[170px_1fr] sm:gap-4">
                <div className="text-[14px] font-medium text-foreground">{t}</div>
                <div className="text-[14px] text-muted-foreground">{d}</div>
              </div>
            ))}
          </div>
          <p className="mt-2 text-[12px] text-muted-foreground">The trading strategy and its settings are proprietary and not published.</p>
        </div>
        <div className="console-card p-5">
          <h2 className="text-[16px] font-medium text-foreground">Targets and licenses</h2>
          <table className="mt-3 w-full text-[14px]">
            <thead>
              <tr className="text-[13px] text-muted-foreground">
                <th className="py-2 text-left font-normal">Plan</th>
                <th className="text-right font-normal">Monthly</th>
                <th className="text-right font-normal">Daily</th>
                <th className="text-right font-normal">IPs</th>
              </tr>
            </thead>
            <tbody>
              {(Object.keys(MT5_PLANS) as (keyof typeof MT5_PLANS)[]).map((k) => (
                <tr key={k} className={`console-row ${access?.allowed && k === plan ? "font-medium" : ""} text-foreground`}>
                  <td className="py-2.5">
                    {MT5_PLANS[k].name}
                    {access?.allowed && k === plan && <span className="ml-2 rounded-full bg-foreground px-2 py-0.5 text-[11px] text-background">Yours</span>}
                  </td>
                  <td className="text-right tabular-nums">${MT5_PLANS[k].monthlyTarget.toLocaleString()}</td>
                  <td className="text-right tabular-nums">${dailyTarget(k)}</td>
                  <td className="text-right tabular-nums">{MT5_PLANS[k].licenses}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create dialog */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl border border-gc-line bg-background p-6 text-foreground shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <div className="text-[18px] font-medium">Add IP</div>
              <button onClick={() => setShowCreate(false)} aria-label="Close" className="rounded-full p-1 text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-1 text-[14px] text-muted-foreground">Enter the public IP of the PC or RDP that runs MT5. The first MT5 account that runs on it is locked in &amp; cannot be changed</p>
            <input
              value={account}
              onChange={(e) => setAccount(e.target.value.replace(/[^0-9a-fA-F.:]/g, ""))}
              placeholder="IP address, e.g. 203.0.113.25"
              className="mt-4 w-full rounded-xl border border-gc-line bg-background px-4 py-2.5 text-[14px] text-foreground outline-none placeholder:text-muted-foreground focus:border-foreground"
            />
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setShowCreate(false)} className="console-pill">Cancel</button>
              <button onClick={onCreate} disabled={creating || account.length < 7} className="console-pill console-pill-solid disabled:opacity-60">
                {creating ? "Adding…" : "Add IP"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Revoke dialog */}
      <ConfirmDialog
        open={!!revokeTarget}
        busy={revoking}
        title="Delete this IP?"
        description={
          <>
            The bot on{" "}
            <span className="font-medium text-foreground">
              {revokeTarget && parseBinding(revokeTarget.mt5_account).ip ? `IP ${parseBinding(revokeTarget.mt5_account).ip}` : "this IP"}
            </span>{" "}
            stops trading at its next check. This can't be undone.
          </>
        }
        onCancel={() => setRevokeTarget(null)}
        onConfirm={onRevoke}
      />
    </div>
  );
}
