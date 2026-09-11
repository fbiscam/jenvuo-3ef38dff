import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Copy, Check, KeyRound, Trash2, Download, FileText, X, Sparkles } from "lucide-react";
import {
  listExtensionKeys,
  createExtensionKey,
  revokeExtensionKey,
  deleteExtensionKey,
  type ExtensionKeyRow,
  type ExtensionKeyAccess,
} from "@/lib/extension-keys.functions";

const MONO = "font-['JetBrains_Mono',ui-monospace,monospace]";

export const Route = createFileRoute("/_authenticated/dashboard/extension")({
  head: () => ({
    meta: [
      { title: "API Keys — Jenvu Extension" },
      { name: "description", content: "Create and manage the API keys the Jenvu XAU/USD ICT/SMC browser extension signs in with." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ExtensionPage,
});

function ExtensionPage() {
  const load = useServerFn(listExtensionKeys);
  const create = useServerFn(createExtensionKey);
  const revoke = useServerFn(revokeExtensionKey);
  const remove = useServerFn(deleteExtensionKey);

  const [keys, setKeys] = useState<ExtensionKeyRow[]>([]);
  const [access, setAccess] = useState<ExtensionKeyAccess | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [name, setName] = useState("");
  const [freshKey, setFreshKey] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [origin, setOrigin] = useState("https://jenvu.com");
  const [downloading, setDownloading] = useState(false);
  const [view, setView] = useState<"keys" | "extension">("keys");
  const [deleteTarget, setDeleteTarget] = useState<ExtensionKeyRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") setOrigin(window.location.origin);
  }, []);

  const refresh = async () => {
    setLoading(true);
    try {
      const res = await load();
      if (res.ok) { setKeys(res.keys); setAccess(res.access); }
      else toast.error(res.error || "Could not load your keys");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not load your keys");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void refresh(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const onCreate = async () => {
    setCreating(true);
    try {
      const res = await create({ data: { name } });
      if (!res.ok) { toast.error(res.error); return; }
      setFreshKey(res.key);
      setName("");
      setShowCreate(false);
      toast.success("API key created — copy it now, it is shown only once.");
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not create the key");
    } finally {
      setCreating(false);
    }
  };

  const onRevoke = async (id: string) => {
    try {
      const res = await revoke({ data: { id } });
      if (!res.ok) { toast.error(res.error); return; }
      toast.success("Key revoked");
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not revoke the key");
    }
  };

  const onDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await remove({ data: { id: deleteTarget.id } });
      if (!res.ok) { toast.error(res.error); return; }
      setDeleteTarget(null);
      toast.success("API key permanently deleted");
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not delete the key");
    } finally {
      setDeleting(false);
    }
  };

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
      const res = await fetch("/jenvu-extension-v1.8.1.zip");
      if (!res.ok) throw new Error(`Download failed: ${res.status}`);
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "jenvu-extension-v1.8.1.zip";
      a.click();
      URL.revokeObjectURL(a.href);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Download failed");
    } finally {
      setDownloading(false);
    }
  };

  const activeKeys = keys.filter((k) => !k.revoked_at);
  const displayedKeys = [...keys]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 4);
  const canCreate = Boolean(access?.active && access.plan !== "free" && activeKeys.length < access.keyLimit);

  return (
    <div className="w-full px-1 py-2 sm:px-2 sm:py-4">
      {/* Header row */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-[26px] font-normal tracking-tight text-zinc-900">API Keys</h1>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowGuide((v) => !v)}
            className="inline-flex items-center gap-2 rounded-full px-3 py-2 text-[13px] text-zinc-700 hover:bg-zinc-100"
          >
            <FileText className="h-4 w-4" /> API quickstart
          </button>
          <button
            onClick={() => { setShowCreate(true); setFreshKey(null); }}
            disabled={!canCreate}
            className="inline-flex items-center gap-2 rounded-full border border-zinc-300 px-4 py-2 text-[13px] font-medium text-zinc-900 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-45"
          >
            <KeyRound className="h-4 w-4" /> Create API key
          </button>
        </div>
      </div>

      {access && (
        <div className="mt-5 grid gap-3 border-y border-zinc-200 py-4 sm:grid-cols-3">
          <div><div className="text-[11px] text-zinc-500">Plan</div><div className="mt-1 text-sm font-medium text-zinc-900">{access.planName}</div></div>
          <div><div className="text-[11px] text-zinc-500">Active API keys</div><div className="mt-1 text-sm font-medium tabular-nums text-zinc-900">{activeKeys.length} / {access.keyLimit}</div></div>
          <div><div className="text-[11px] text-zinc-500">AI wallet</div><div className={`mt-1 text-sm font-medium tabular-nums ${access.balance < 0.02 ? "text-rose-600" : "text-zinc-900"}`}>${access.balance.toFixed(2)} / ${access.wallet.toFixed(2)}</div></div>
        </div>
      )}

      {/* Filter row */}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-[13px] text-zinc-500">Group by</span>
          <div className="flex items-center gap-1 rounded-full bg-zinc-100 p-0.5">
            <button
              type="button"
              onClick={() => setView("keys")}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] ${view === "keys" ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-600 hover:text-zinc-900"}`}
            >
              {view === "keys" && <span className="h-1.5 w-1.5 rounded-full bg-zinc-900" />} API Key
            </button>
            <button
              type="button"
              onClick={() => setView("extension")}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] ${view === "extension" ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-600 hover:text-zinc-900"}`}
            >
              {view === "extension" && <span className="h-1.5 w-1.5 rounded-full bg-zinc-900" />} Extension
            </button>
          </div>
        </div>
      </div>

      {/* Fresh key banner */}
      {freshKey && (
        <div className="mt-5 rounded-lg border border-amber-300 bg-amber-50 p-3">
          <div className="text-[12px] font-medium text-amber-800">Copy this key now — it will not be shown again.</div>
          <div className="mt-2 flex items-center gap-2">
            <code className={`${MONO} flex-1 truncate rounded border border-amber-200 bg-white px-2 py-1.5 text-[12px] text-zinc-900`}>{freshKey}</code>
            <button
              onClick={() => copyValue(freshKey, "fresh")}
              className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-white px-2.5 py-1.5 text-[12px] text-amber-800 hover:bg-amber-100"
            >
              {copied === "fresh" ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />} Copy
            </button>
          </div>
        </div>
      )}

      {/* API key list */}
      {view === "keys" && <div className="mt-5">
        <div className="mb-4 flex items-end justify-between gap-3">
          <div>
            <h2 className="text-[16px] font-medium text-zinc-900">&nbsp; Recent api keys</h2>
            <p className="mt-1 text-[12px] text-zinc-500">Your four newest extension keys, newest first.</p>
          </div>
          <span className="shrink-0 text-[12px] tabular-nums text-zinc-500">{displayedKeys.length} shown</span>
        </div>
        <div className="hidden grid-cols-[1.5fr_1.4fr_0.8fr_0.9fr_auto] items-center gap-4 border-b border-zinc-200 pb-3 text-[13px] text-zinc-700 md:grid">
          <div>API key</div>
          <div>Extension</div>
          <div>Created</div>
          <div>Status</div>
          <div className="w-24" />
        </div>

        {loading ? (
          <div className="py-6 text-[13px] text-zinc-500">Loading…</div>
        ) : (
          displayedKeys.map((k) => (
            <div
              key={k.id}
              className="grid gap-3 border-b border-zinc-100 py-4 md:grid-cols-[1.5fr_1.4fr_0.8fr_0.9fr_auto] md:items-center md:gap-4"
            >
              <div className="min-w-0">
                <div className="mb-1 flex items-center gap-2">
                  <span className="text-[11px] text-zinc-500 md:hidden">API key</span>
                  {k.id === displayedKeys[0]?.id && (
                    <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-700">Newest</span>
                  )}
                </div>
                <div className="flex min-w-0 items-center gap-1 rounded-md border border-zinc-200 bg-zinc-50 px-2.5 py-2">
                  <code className={`${MONO} min-w-0 flex-1 truncate text-[12px] text-zinc-900`}>{k.key_prefix}••••••••••</code>
                  <button
                    type="button"
                    title="Copy visible key prefix"
                    aria-label={`Copy visible prefix for ${k.name}`}
                    onClick={() => copyValue(k.key_prefix, k.id)}
                    className="shrink-0 rounded p-1 text-zinc-500 hover:bg-white hover:text-zinc-900"
                  >
                    {copied === k.id ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                </div>
                <div className="mt-1.5 truncate text-[12px] text-zinc-500">{k.name}</div>
              </div>
              <div className="min-w-0">
                <div className="mb-1 text-[11px] text-zinc-500 md:hidden">Extension</div>
                <div className="truncate text-[13px] text-blue-700">Jenvu XAU/USD Extension</div>
                <div className={`${MONO} truncate text-[12px] text-zinc-500`}>v1.8.1</div>
              </div>
              <div className="text-[13px] text-zinc-800">
                <div className="mb-1 text-[11px] text-zinc-500 md:hidden">Created</div>
                {new Date(k.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
              </div>
              <div>
                <div className="mb-1 text-[11px] text-zinc-500 md:hidden">Status</div>
                {k.revoked_at ? (
                  <div className="text-[13px] text-zinc-500">Revoked</div>
                ) : (
                  <>
                    <div className="text-[13px] text-emerald-700">Active</div>
                    <div className="text-[12px] text-zinc-500">
                      {k.last_used_at ? `Used ${new Date(k.last_used_at).toLocaleDateString()}` : "Never used"}
                    </div>
                  </>
                )}
              </div>
              <div className="flex items-center justify-end gap-1 md:w-24">
                {!k.revoked_at && (
                  <button
                    type="button"
                    title="Revoke key"
                    aria-label={`Revoke ${k.name}`}
                    onClick={() => onRevoke(k.id)}
                    className="rounded-full p-2 text-zinc-500 hover:bg-rose-50 hover:text-rose-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
                {k.revoked_at && (
                  <button
                    type="button"
                    title="Delete permanently"
                    aria-label={`Permanently delete ${k.name}`}
                    onClick={() => setDeleteTarget(k)}
                    className="rounded-full p-2 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          ))
        )}

        {!loading && keys.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Sparkles className="h-12 w-12 text-zinc-300" strokeWidth={1} />
            <div className="mt-6 text-[15px] font-medium text-zinc-900">Can&apos;t find your API keys here?</div>
            <p className="mt-2 max-w-md text-[13px] leading-relaxed text-zinc-500">
              This list only shows keys created for the Jenvu extension. Create a new API key above, paste it into the
              extension and it signs in instantly.
            </p>
            <button
              onClick={() => setShowCreate(true)}
              disabled={!canCreate}
              className="mt-6 rounded-full border border-zinc-300 px-4 py-2 text-[13px] text-zinc-900 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-45"
            >
              Create API key
            </button>
          </div>
        )}

        {!loading && keys.length > 0 && (
          <div className="mt-3 text-[12px] text-zinc-500">
            Showing {displayedKeys.length} of {keys.length} key(s) · {activeKeys.length} of {access?.keyLimit ?? 0} active.
          </div>
        )}
      </div>}

      {/* Extension releases */}
      {view === "extension" && (
        <div className="mt-5">
          <div className="mb-4">
            <h2 className="text-[16px] font-medium text-zinc-900">  Latest extension</h2>
            <p className="mt-1 text-[12px] text-zinc-500">The newest tested release available for your account.</p>
          </div>
          <div className="hidden grid-cols-[minmax(0,1.8fr)_0.8fr_0.8fr_auto] items-center gap-4 border-b border-zinc-200 pb-3 text-[13px] text-zinc-700 md:grid">
            <div>Extension</div>
            <div>Version</div>
            <div>Release</div>
            <div className="w-40" />
          </div>
          <div className="grid gap-4 border-b border-zinc-100 py-5 md:grid-cols-[minmax(0,1.8fr)_0.8fr_0.8fr_auto] md:items-center">
            <div className="min-w-0">
              <div className="truncate text-[14px] font-medium text-zinc-900">Jenvu — ICT/SMC Gold Analyst</div>
              <div className="mt-1 text-[12px] text-zinc-500">Chrome extension for live XAU/USD analysis</div>
            </div>
            <div className="flex items-center gap-2 text-[13px] text-zinc-800">
              <span className={MONO}>v1.8.1</span>
              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">Latest</span>
            </div>
            <div className="text-[13px] text-zinc-600">Updated Sep 10, 2026</div>
            <button
              type="button"
              onClick={onDownload}
              disabled={downloading}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-zinc-300 px-3 py-2 text-[13px] font-medium text-zinc-900 hover:bg-zinc-50 disabled:opacity-60 md:w-40"
            >
              <Download className="h-4 w-4" /> {downloading ? "Preparing…" : "Download latest"}
            </button>
          </div>
          <p className="mt-4 text-[12px] text-zinc-500">ZIP package · Chrome developer mode · Version 1.8.1</p>
        </div>
      )}

      {/* Quickstart drawer */}
      {showGuide && (
        <div className="mt-6 rounded-xl border border-zinc-200 bg-zinc-50 p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="text-[13px] font-medium text-zinc-900">API quickstart</div>
            <button onClick={() => setShowGuide(false)} className="rounded-full p-1 text-zinc-500 hover:bg-zinc-200">
              <X className="h-4 w-4" />
            </button>
          </div>
          <p className="mt-3 text-[12px] leading-relaxed text-zinc-600">Live snapshots are free. AI chat and analysis cost $0.02 plus GPT/Gemini token usage with mandatory senior review.</p>
          <ol className="mt-3 space-y-2 text-[13px] leading-relaxed text-zinc-700">
            <li>1. Download the extension package above and unzip it.</li>
            <li>2. Open <span className={`${MONO} rounded bg-white px-1.5 py-0.5 text-[12px]`}>chrome://extensions</span>, turn on Developer mode.</li>
            <li>3. Click <span className="font-medium">Load unpacked</span> and select the unzipped folder.</li>
            <li>4. Open the Jenvu icon, paste your API key and press <span className="font-medium">Connect</span>.</li>
            <li>5. Press <span className="font-medium">Analyze XAU/USD</span> for a live ICT/SMC read with AI second review.</li>
          </ol>
          <div className={`${MONO} mt-4 space-y-1 rounded-lg border border-zinc-200 bg-white p-3 text-[12px] text-zinc-700`}>
            <div>POST {origin}/api/public/extension/verify</div>
            <div>POST {origin}/api/public/extension/analyze</div>
            <div className="text-zinc-500">Header: Authorization: Bearer &lt;your key&gt;</div>
          </div>
        </div>
      )}

      {/* Create dialog */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/30 p-4">
          <div className="w-full max-w-md rounded-xl border border-zinc-200 bg-white p-5 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <div className="text-[15px] font-medium text-zinc-900">Create API key</div>
              <button onClick={() => setShowCreate(false)} className="rounded-full p-1 text-zinc-500 hover:bg-zinc-100">
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-1 text-[13px] text-zinc-500">Give the key a name so you can recognise the device using it.</p>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Key name (e.g. My laptop)"
              className="mt-4 w-full rounded-lg border border-zinc-300 px-3 py-2 text-[13px] outline-none focus:border-zinc-500"
            />
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setShowCreate(false)}
                className="rounded-full px-4 py-2 text-[13px] text-zinc-700 hover:bg-zinc-100"
              >
                Cancel
              </button>
              <button
                onClick={onCreate}
                disabled={creating}
                className="rounded-full bg-zinc-900 px-4 py-2 text-[13px] font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
              >
                {creating ? "Creating…" : "Create key"}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/30 p-4">
          <div role="dialog" aria-modal="true" aria-labelledby="delete-key-title" className="w-full max-w-md rounded-xl border border-zinc-200 bg-white p-5 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <div id="delete-key-title" className="text-[15px] font-medium text-zinc-900">Delete API key permanently?</div>
              <button type="button" aria-label="Close delete confirmation" onClick={() => setDeleteTarget(null)} className="rounded-full p-1 text-zinc-500 hover:bg-zinc-100">
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-2 text-[13px] leading-relaxed text-zinc-500">
              <span className="font-medium text-zinc-800">{deleteTarget.name}</span> will be removed from your account and database. This cannot be undone.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setDeleteTarget(null)} disabled={deleting} className="rounded-full px-4 py-2 text-[13px] text-zinc-700 hover:bg-zinc-100 disabled:opacity-60">
                Cancel
              </button>
              <button type="button" onClick={onDelete} disabled={deleting} className="rounded-full bg-rose-600 px-4 py-2 text-[13px] font-medium text-white hover:bg-rose-700 disabled:opacity-60">
                {deleting ? "Deleting…" : "Delete permanently"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
