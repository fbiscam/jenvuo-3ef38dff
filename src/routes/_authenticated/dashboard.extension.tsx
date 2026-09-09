import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Copy, Check, KeyRound, Trash2, Download, FileText, X, Sparkles } from "lucide-react";
import {
  listExtensionKeys,
  createExtensionKey,
  revokeExtensionKey,
  type ExtensionKeyRow,
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

  const [keys, setKeys] = useState<ExtensionKeyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [name, setName] = useState("");
  const [freshKey, setFreshKey] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [origin, setOrigin] = useState("https://jenvu.com");
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") setOrigin(window.location.origin);
  }, []);

  const refresh = async () => {
    setLoading(true);
    try {
      const res = await load();
      if (res.ok) setKeys(res.keys);
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

  return (
    <div className="rounded-xl border border-zinc-200 bg-white px-6 py-6 sm:px-10 sm:py-8">
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
            className="inline-flex items-center gap-2 rounded-full border border-zinc-300 px-4 py-2 text-[13px] font-medium text-zinc-900 hover:bg-zinc-50"
          >
            <KeyRound className="h-4 w-4" /> Create API key
          </button>
        </div>
      </div>

      {/* Filter row */}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-[13px] text-zinc-500">Group by</span>
          <div className="flex items-center gap-1 rounded-full bg-zinc-100 p-0.5">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-[13px] text-zinc-900 shadow-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-zinc-900" /> API Key
            </span>
            <span className="rounded-full px-3 py-1.5 text-[13px] text-zinc-600">Extension</span>
          </div>
        </div>
        <button
          onClick={onDownload}
          disabled={downloading}
          className="inline-flex items-center gap-2 rounded-lg border border-zinc-300 px-3 py-2 text-[13px] text-zinc-800 hover:bg-zinc-50 disabled:opacity-60"
        >
          <Download className="h-4 w-4" /> {downloading ? "Preparing…" : "Download extension (v1.8.1)"}
        </button>
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

      {/* Table */}
      <div className="mt-5">
        <div className="grid grid-cols-[1.4fr_1.6fr_1fr_1fr_auto] items-center gap-4 border-b border-zinc-200 pb-3 text-[13px] text-zinc-700">
          <div>Key</div>
          <div>Extension</div>
          <div>Created</div>
          <div>Status</div>
          <div className="w-24" />
        </div>

        {loading ? (
          <div className="py-6 text-[13px] text-zinc-500">Loading…</div>
        ) : (
          keys.map((k) => (
            <div
              key={k.id}
              className="grid grid-cols-[1.4fr_1.6fr_1fr_1fr_auto] items-center gap-4 border-b border-zinc-100 py-4"
            >
              <div className="min-w-0">
                <div className={`${MONO} truncate text-[13px] text-blue-700`}>…{k.key_prefix}</div>
                <div className="truncate text-[12px] text-zinc-500">{k.name}</div>
              </div>
              <div className="min-w-0">
                <div className="truncate text-[13px] text-blue-700">Jenvu XAU/USD Extension</div>
                <div className={`${MONO} truncate text-[12px] text-zinc-500`}>v1.8.1</div>
              </div>
              <div className="text-[13px] text-zinc-800">
                {new Date(k.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
              </div>
              <div>
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
              <div className="flex w-24 items-center justify-end gap-1">
                <button
                  title="Copy key prefix"
                  onClick={() => copyValue(k.key_prefix, k.id)}
                  className="rounded-full p-2 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800"
                >
                  {copied === k.id ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </button>
                {!k.revoked_at && (
                  <button
                    title="Revoke key"
                    onClick={() => onRevoke(k.id)}
                    className="rounded-full p-2 text-zinc-500 hover:bg-rose-50 hover:text-rose-600"
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
              className="mt-6 rounded-full border border-zinc-300 px-4 py-2 text-[13px] text-zinc-900 hover:bg-zinc-50"
            >
              Create API key
            </button>
          </div>
        )}

        {!loading && keys.length > 0 && (
          <div className="mt-3 text-[12px] text-zinc-500">{activeKeys.length} active key(s) · maximum 5.</div>
        )}
      </div>

      {/* Quickstart drawer */}
      {showGuide && (
        <div className="mt-6 rounded-xl border border-zinc-200 bg-zinc-50 p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="text-[13px] font-medium text-zinc-900">API quickstart</div>
            <button onClick={() => setShowGuide(false)} className="rounded-full p-1 text-zinc-500 hover:bg-zinc-200">
              <X className="h-4 w-4" />
            </button>
          </div>
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
    </div>
  );
}
