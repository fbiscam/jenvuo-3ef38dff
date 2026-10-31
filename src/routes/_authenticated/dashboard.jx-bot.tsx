import { ConfirmDialog } from "@/components/ConfirmDialog";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Bot, Check, Copy, Download, FileText, KeyRound, Trash2, Wrench, X } from "lucide-react";
import { useMt5Access } from "@/components/dashboard/Mt5Licenses";
import { createMt5License, getBotDownloadUrl, revokeMt5License, type Mt5LicenseRow } from "@/lib/mt5-licenses.functions";
import { MT5_PLANS, countIpLicenses, dailyTarget, isMt5Plan, parseBinding } from "@/lib/mt5-licenses";

const MONO = "font-['JetBrains_Mono',ui-monospace,monospace]";

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

  return (
    <div className="keep-case w-full px-1 py-2 sm:px-2 sm:py-4" data-page="jx-bot">
      {/* Header row */}
      <div className="grid grid-cols-1 items-center gap-2 sm:flex sm:flex-wrap sm:justify-between sm:gap-3">
        <h1 className="min-w-0 text-[26px] font-normal tracking-tight text-zinc-900">JX Bot</h1>
        <div className="flex min-w-0 flex-wrap items-center gap-2 sm:gap-3">
          <button
            onClick={() => setShowGuide((v) => !v)}
            className="hidden items-center gap-2 rounded-full px-3 py-2 text-[13px] text-zinc-700 hover:bg-zinc-100 sm:inline-flex"
          >
            <FileText className="h-4 w-4" /> Install guide
          </button>
          <button
            onClick={() => setShowFix((v) => !v)}
            className="hidden items-center gap-2 rounded-full px-3 py-2 text-[13px] text-zinc-700 hover:bg-zinc-100 sm:inline-flex"
          >
            <Wrench className="h-4 w-4" /> Troubleshooting
          </button>
          <button
            onClick={onDownload}
            disabled={!access?.allowed || downloading}
            className="inline-flex items-center gap-2 rounded-full border border-zinc-300 px-4 py-2 text-[13px] font-medium text-zinc-900 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-45"
          >
            <Download className="h-4 w-4" /> {downloading ? "Preparing…" : "Download bot"}
          </button>
          <button
            onClick={() => setShowCreate(true)}
            disabled={!canCreate}
            className="inline-flex items-center gap-2 rounded-full border border-zinc-300 px-4 py-2 text-[13px] font-medium text-zinc-900 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-45"
          >
            <KeyRound className="h-4 w-4" /> Add IP
          </button>
        </div>
      </div>

      {access && (
        <div className="mt-5 grid grid-cols-2 gap-3 border-y border-zinc-200 py-4 sm:grid-cols-4">
          <div>
            <div className="text-[11px] text-zinc-500">Plan</div>
            <div className="mt-1 text-sm font-medium text-zinc-900">{access.allowed ? MT5_PLANS[plan].name : "No plan"}</div>
          </div>
          <div>
            <div className="text-[11px] text-zinc-500">Linked licenses</div>
            <div className="mt-1 text-sm font-medium tabular-nums text-zinc-900">{bound} / {limit}</div>
          </div>
          <div>
            <div className="text-[11px] text-zinc-500">Daily target</div>
            <div className="mt-1 text-sm font-medium tabular-nums text-zinc-900">{access.allowed ? `$${(access.dailyTarget || dailyTarget(plan)).toLocaleString()}` : "—"}</div>
          </div>
          <div>
            <div className="text-[11px] text-zinc-500">Monthly target</div>
            <div className="mt-1 text-sm font-medium tabular-nums text-zinc-900">
              {access.allowed ? `$${(access.monthlyTarget || MT5_PLANS[plan].monthlyTarget).toLocaleString()}` : "—"}
            </div>
          </div>
        </div>
      )}

      {access && !access.allowed && (
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-[13px] text-amber-900">
          <span>JX Bot is included with Pro, Elite or Ultra, and free for 14 days with the free trial. Credit alone does not unlock it.</span>
          <Link to="/dashboard/billing" className="rounded-full border border-amber-300 bg-white px-4 py-1.5 text-[12px] font-medium text-amber-900 hover:bg-amber-100">
            Buy now
          </Link>
        </div>
      )}

      {/* Install guide drawer */}
      {showGuide && (
        <div className="mt-6 rounded-xl border border-zinc-200 bg-zinc-50 p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="text-[13px] font-medium text-zinc-900">Install guide</div>
            <button onClick={() => setShowGuide(false)} className="rounded-full p-1 text-zinc-500 hover:bg-zinc-200">
              <X className="h-4 w-4" />
            </button>
          </div>
          <ol className="mt-3 space-y-4 text-[13px] leading-relaxed text-zinc-700">
            {STEPS.map((s, i) => (
              <li key={s.title} className="flex gap-3">
                <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-[11px] font-medium text-white">{i + 1}</span>
                <div className="min-w-0 flex-1">
                <div className="font-medium text-zinc-900">{s.title}</div>
                <div className="mt-0.5">{s.text}</div>
                {s.code && (
                  <div className="mt-2 flex items-center gap-2">
                    <code className={`${MONO} min-w-0 flex-1 truncate rounded-md border border-zinc-200 bg-white px-2.5 py-2 text-[12px] text-zinc-900`}>{s.code}</code>
                    <button
                      type="button"
                      onClick={() => copyValue(s.code!, `step-${i}`)}
                      className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-2.5 py-2 text-[12px] text-zinc-700 hover:bg-zinc-50"
                    >
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
        <div className="mt-6 rounded-xl border border-zinc-200 bg-zinc-50 p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="text-[13px] font-medium text-zinc-900">If the IP check fails</div>
            <button onClick={() => setShowFix(false)} className="rounded-full p-1 text-zinc-500 hover:bg-zinc-200">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className={`${MONO} mt-3 space-y-1.5 rounded-lg border border-zinc-200 bg-white p-3 text-[12px]`}>
            {ERRORS.map(([err, fix]) => (
              <div key={err} className="flex flex-col gap-0.5 sm:flex-row sm:gap-3">
                <span className="shrink-0 text-rose-600 sm:w-48">✕ {err}</span>
                <span className="text-zinc-600">→ {fix}</span>
              </div>
            ))}
          </div>
          <p className="mt-3 text-[12px] text-zinc-500">Start with a small lot size. Targets are limits the bot stops at, not promised results.</p>
        </div>
      )}

      {/* License list */}
      <div className="mt-5">
        <div className="mb-4 flex items-end justify-between gap-3">
          <div>
            <h2 className="text-[16px] font-medium text-zinc-900">  Your IP addresses</h2>
            <p className="mt-1 text-[12px] text-zinc-500">Each IP works with one MT5 account only.</p>
          </div>
          <span className="shrink-0 text-[12px] tabular-nums text-zinc-500">{licenses.length} shown</span>
        </div>
        <div className="hidden grid-cols-[1.6fr_1fr_0.8fr_1fr_auto] items-center gap-4 border-b border-zinc-200 pb-3 text-[13px] text-zinc-700 md:grid">
          <div>IP address</div>
          <div>MT5 account</div>
          <div>Created</div>
          <div>Status</div>
          <div className="w-16" />
        </div>

        {loading ? (
          <div className="py-6 text-[13px] text-zinc-500">Loading…</div>
        ) : (
          licenses.map((l) => (
            <div key={l.id} className="grid gap-3 border-b border-zinc-100 py-4 md:grid-cols-[1.6fr_1fr_0.8fr_1fr_auto] md:items-center md:gap-4">
              <div className="min-w-0">
                <div className="mb-1 flex items-center gap-2">
                  <span className="text-[11px] text-zinc-500 md:hidden">IP address</span>
                  {l.id === licenses[0]?.id && (
                    <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-700">Newest</span>
                  )}
                </div>
                <div className="flex min-w-0 items-center gap-1 rounded-md border border-zinc-200 bg-zinc-50 px-2.5 py-2">
                  <code className={`${MONO} min-w-0 flex-1 truncate text-[12px] text-zinc-900`}>{parseBinding(l.mt5_account).ip ?? "No IP yet"}</code>
                  {!l.revoked_at && (
                    <button
                      type="button"
                      aria-label="Copy IP address"
                      onClick={() => copyValue(parseBinding(l.mt5_account).ip ?? "", l.id)}
                      className="shrink-0 rounded p-1 text-zinc-500 hover:bg-white hover:text-zinc-900"
                    >
                      {copied === l.id ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    </button>
                  )}
                </div>
                <div className="mt-1.5 truncate text-[12px] text-zinc-500">{MT5_PLANS[isMt5Plan(l.plan_id) ? l.plan_id : "pro"].name} plan</div>
              </div>
              <div className="min-w-0">
                <div className="mb-1 text-[11px] text-zinc-500 md:hidden">MT5 account</div>
                {parseBinding(l.mt5_account).account ? (
                  <div className={`${MONO} truncate text-[13px] text-blue-700`}>{parseBinding(l.mt5_account).account}</div>
                ) : (
                  <div className="text-[13px] text-zinc-500">Locks to the first account</div>
                )}
                <div className="truncate text-[12px] text-zinc-500">EURUSD · M15</div>
              </div>
              <div className="text-[13px] text-zinc-800">
                <div className="mb-1 text-[11px] text-zinc-500 md:hidden">Created</div>
                {fmtDate(l.created_at)}
              </div>
              <div>
                <div className="mb-1 text-[11px] text-zinc-500 md:hidden">Status</div>
                {l.revoked_at ? (
                  <div className="text-[13px] text-zinc-500">Revoked</div>
                ) : (
                  <>
                    <div className="text-[13px] text-emerald-700">Active</div>
                    <div className="text-[12px] text-zinc-500">
                      {l.last_validated_at ? `Checked ${new Date(l.last_validated_at).toLocaleDateString()}` : "Never checked"}
                    </div>
                  </>
                )}
              </div>
              <div className="flex items-center justify-end gap-1 md:w-16">
                <button
                  type="button"
                  title="Delete IP"
                  aria-label="Delete IP"
                  onClick={() => setRevokeTarget(l)}
                  className="rounded-full p-2 text-zinc-500 hover:bg-rose-50 hover:text-rose-600"
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </button>
              </div>
            </div>
          ))
        )}

        {!loading && licenses.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Bot className="h-12 w-12 text-zinc-300" strokeWidth={1} />
            <div className="mt-6 text-[15px] font-medium text-zinc-900">No licenses yet</div>
            <p className="mt-2 max-w-md text-[13px] leading-relaxed text-zinc-500">
              Add the IP of your PC or RDP, download the bot and type the same IP
            </p>
            <button
              onClick={() => setShowCreate(true)}
              disabled={!canCreate}
              className="mt-6 rounded-full border border-zinc-300 px-4 py-2 text-[13px] text-zinc-900 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-45"
            >
              Add IP
            </button>
          </div>
        )}

        {!loading && licenses.length > 0 && (
          <div className="mt-3 text-[12px] text-zinc-500">{active.length} active · {bound} of {limit} IPs used.</div>
        )}
      </div>

      {/* How it works + plans */}
      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_360px]">
        <div>
          <h2 className="text-[16px] font-medium text-zinc-900"> How JX Bot works</h2>
          <div className="mt-3 divide-y divide-zinc-100 border-y border-zinc-200">
            {HOW.map(([t, d]) => (
              <div key={t} className="grid gap-1 py-3 sm:grid-cols-[180px_1fr] sm:gap-4">
                <div className="text-[13px] font-medium text-zinc-900">{t}</div>
                <div className="text-[13px] text-zinc-600">{d}</div>
              </div>
            ))}
          </div>
          <p className="mt-2 text-[12px] text-zinc-500">The trading strategy and its settings are proprietary and not published.</p>
        </div>
        <div>
          <h2 className="text-[16px] font-medium text-zinc-900">Targets and licenses</h2>
          <table className="mt-3 w-full border-y border-zinc-200 text-[13px]">
            <thead>
              <tr className="text-zinc-500">
                <th className="py-2 text-left font-normal">Plan</th>
                <th className="text-right font-normal">Monthly</th>
                <th className="text-right font-normal">Daily</th>
                <th className="text-right font-normal">Licenses</th>
              </tr>
            </thead>
            <tbody>
              {(Object.keys(MT5_PLANS) as (keyof typeof MT5_PLANS)[]).map((k) => (
                <tr key={k} className={`border-t border-zinc-100 ${access?.allowed && k === plan ? "font-medium text-blue-700" : "text-zinc-800"}`}>
                  <td className="py-2">{MT5_PLANS[k].name}</td>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/30 p-4">
          <div className="w-full max-w-md rounded-xl border border-zinc-200 bg-white p-5 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <div className="text-[15px] font-medium text-zinc-900">Add IP</div>
              <button onClick={() => setShowCreate(false)} className="rounded-full p-1 text-zinc-500 hover:bg-zinc-100">
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-1 text-[13px] text-zinc-500">Enter the public IP of the PC or RDP that runs MT5. The first MT5 account that runs on it is locked in &amp; cannot be changed</p>
            <input
              value={account}
              onChange={(e) => setAccount(e.target.value.replace(/[^0-9a-fA-F.:]/g, ""))}
              placeholder="IP address, e.g. 203.0.113.25"
              className="mt-4 w-full rounded-lg border border-zinc-300 px-3 py-2 text-[13px] outline-none focus:border-zinc-500"
            />
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setShowCreate(false)} className="rounded-full px-4 py-2 text-[13px] text-zinc-700 hover:bg-zinc-100">
                Cancel
              </button>
              <button
                onClick={onCreate}
                disabled={creating || account.length < 7}
                className="rounded-full bg-zinc-900 px-4 py-2 text-[13px] font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
              >
                {creating ? "Creating…" : "Add IP"}
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
