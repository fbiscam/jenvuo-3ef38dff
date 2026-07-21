import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  listExtensionTokens,
  mintExtensionToken,
  revokeExtensionToken,
  type ExtensionToken,
} from "@/lib/extension-tokens.functions";

export const Route = createFileRoute("/_authenticated/dashboard/extension")({
  head: () => ({
    meta: [
      { title: "Chrome Extension · Jenvu Desk" },
      { name: "description", content: "Download the Jenvu TradingView Chrome extension and mint API tokens to auto-draw signals on your chart." },
    ],
  }),
  component: ExtensionPage,
  errorComponent: ({ error, reset }) => {
    const router = useRouter();
    return (
      <div className="p-6 rounded-xl border border-red-200 bg-red-50 text-sm text-red-800">
        <div className="font-medium mb-1">Something went wrong</div>
        <div className="mb-3">{(error as Error)?.message ?? "Unknown error"}</div>
        <button className="px-3 py-1.5 rounded-md bg-white border border-red-300"
          onClick={() => { void router.invalidate(); reset(); }}>Retry</button>
      </div>
    );
  },
  notFoundComponent: () => <div className="p-6">Not found.</div>,
});

function ExtensionPage() {
  const list = useServerFn(listExtensionTokens);
  const mint = useServerFn(mintExtensionToken);
  const revoke = useServerFn(revokeExtensionToken);
  const [tokens, setTokens] = useState<ExtensionToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [freshToken, setFreshToken] = useState<string | null>(null);
  const [name, setName] = useState("My Chrome");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const refresh = () => {
    setLoading(true);
    list()
      .then((r) => setTokens(r.tokens))
      .catch((e) => setErr((e as Error).message))
      .finally(() => setLoading(false));
  };
  useEffect(() => { refresh(); /* eslint-disable-next-line */ }, []);

  const create = async () => {
    setBusy(true); setErr(null);
    try {
      const r = await mint({ data: { name: name.trim() || "Chrome Extension" } });
      setFreshToken(r.token);
      refresh();
    } catch (e) { setErr((e as Error).message); }
    finally { setBusy(false); }
  };

  const doRevoke = async (id: string) => {
    if (!confirm("Revoke this token? The extension using it will stop receiving signals.")) return;
    try { await revoke({ data: { id } }); refresh(); }
    catch (e) { setErr((e as Error).message); }
  };

  const downloadZip = () => {
    fetch("/jenvu-tradingview-extension.zip")
      .then((res) => { if (!res.ok) throw new Error(`Download failed: ${res.status}`); return res.blob(); })
      .then((blob) => {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = "jenvu-tradingview-extension.zip";
        a.click();
        URL.revokeObjectURL(a.href);
      })
      .catch((e) => alert(e.message));
  };

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-6" style={{ fontFamily: "'Google Sans', system-ui, sans-serif" }}>
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Chrome Extension</h1>
        <p className="text-sm text-zinc-600 mt-1">
          Jenvu automatically opens TradingView and draws Entry, Stop-Loss and Take-Profit on your chart whenever a new signal fires.
        </p>
      </header>

      <section className="rounded-xl border border-zinc-200 bg-white p-5 space-y-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <div className="text-sm font-semibold text-zinc-900">1 · Download the extension</div>
            <p className="text-xs text-zinc-500 mt-1">Unpacked Chrome / Edge / Brave / Arc extension.</p>
          </div>
          <button onClick={downloadZip}
            className="px-4 py-2 rounded-lg bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-800">
            Download .zip
          </button>
        </div>
        <ol className="text-xs text-zinc-700 space-y-1 pl-5 list-decimal">
          <li>Unzip the downloaded file.</li>
          <li>Open <code className="px-1 py-0.5 bg-zinc-100 rounded">chrome://extensions</code>.</li>
          <li>Enable <b>Developer mode</b> (top right).</li>
          <li>Click <b>Load unpacked</b> and select the unzipped folder.</li>
          <li>Pin the Jenvu icon next to the URL bar.</li>
        </ol>
      </section>

      <section className="rounded-xl border border-zinc-200 bg-white p-5 space-y-4">
        <div>
          <div className="text-sm font-semibold text-zinc-900">2 · Generate an access token</div>
          <p className="text-xs text-zinc-500 mt-1">Paste this token into the extension popup. Anyone with it can read your latest signals — treat like a password.</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <input value={name} onChange={(e) => setName(e.target.value)}
            placeholder="Device / label"
            className="flex-1 min-w-[200px] px-3 py-2 rounded-lg border border-zinc-200 text-sm" />
          <button onClick={create} disabled={busy}
            className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-50">
            {busy ? "Generating…" : "Generate token"}
          </button>
        </div>

        {freshToken && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs space-y-2">
            <div className="font-medium text-emerald-900">Copy this token now — it will not be shown again:</div>
            <div className="flex gap-2 items-center">
              <code className="flex-1 px-2 py-1.5 rounded bg-white border border-emerald-200 font-mono break-all text-emerald-900">{freshToken}</code>
              <button className="px-2 py-1.5 rounded bg-emerald-600 text-white"
                onClick={() => { navigator.clipboard.writeText(freshToken); }}>Copy</button>
            </div>
          </div>
        )}

        {err && <div className="text-xs text-red-600">{err}</div>}

        <div>
          <div className="text-xs font-semibold text-zinc-700 mb-2">Your tokens</div>
          {loading ? (
            <div className="text-xs text-zinc-500">Loading…</div>
          ) : tokens.length === 0 ? (
            <div className="text-xs text-zinc-500">No tokens yet.</div>
          ) : (
            <ul className="divide-y divide-zinc-100 rounded-lg border border-zinc-200">
              {tokens.map((t) => (
                <li key={t.id} className="flex items-center justify-between px-3 py-2 text-xs">
                  <div>
                    <div className="font-medium text-zinc-900">{t.name}</div>
                    <div className="text-zinc-500 font-mono">
                      {t.token_prefix}… · created {new Date(t.created_at).toLocaleDateString()}
                      {t.last_used_at ? ` · last used ${new Date(t.last_used_at).toLocaleString()}` : " · never used"}
                      {t.revoked_at ? " · revoked" : ""}
                    </div>
                  </div>
                  {!t.revoked_at && (
                    <button onClick={() => doRevoke(t.id)} className="px-2 py-1 rounded text-red-600 hover:bg-red-50">Revoke</button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="rounded-xl border border-zinc-200 bg-white p-5 space-y-2">
        <div className="text-sm font-semibold text-zinc-900">3 · Configure &amp; done</div>
        <p className="text-xs text-zinc-600">
          Open the extension popup, paste the token, and click <b>Connect</b>. Keep a TradingView tab open — whenever a new Jenvu alert fires (any XAU pair) the extension will:
        </p>
        <ul className="text-xs text-zinc-700 list-disc pl-5 space-y-0.5">
          <li>Switch the chart to the alert's pair.</li>
          <li>Draw horizontal lines for <b>Entry</b>, <b>Stop-Loss</b> and <b>Take-Profit</b>.</li>
          <li>Show a floating summary card with grade, R:R and confidence.</li>
        </ul>
        <p className="text-[11px] text-zinc-500 pt-1">
          Note: TradingView renders its chart on a canvas, so drawings use the price scale for placement. If TradingView changes their UI, use the popup's <b>Copy levels</b> button as a fallback.
        </p>
      </section>
    </div>
  );
}
