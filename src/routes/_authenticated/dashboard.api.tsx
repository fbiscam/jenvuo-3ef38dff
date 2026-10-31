import { ConfirmDialog } from "@/components/ConfirmDialog";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Copy, Check, Plus, Search, Trash2, FileText, X, Terminal } from "lucide-react";
import {
  listExtensionKeys,
  createExtensionKey,
  revokeExtensionKey,
  deleteExtensionKey,
  revealExtensionKey,
  type ExtensionKeyRow,
  type ExtensionKeyAccess,
} from "@/lib/extension-keys.functions";
import { getPlanCapabilities } from "@/lib/plan-entitlements";

const MONO = "font-sans";
const API_BASE = "https://jenvu.com/api/public/v1";

export const Route = createFileRoute("/_authenticated/dashboard/api")({
  head: () => ({
    meta: [
      { title: "API Keys — Jenvu Extension" },
      {
        name: "description",
        content:
          "Create and manage API keys for Jenvu multi-market ICT/SMC browser extension analysis.",
      },
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
  const reveal = useServerFn(revealExtensionKey);

  const [keys, setKeys] = useState<ExtensionKeyRow[]>([]);
  const [access, setAccess] = useState<ExtensionKeyAccess | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [showEndpoint, setShowEndpoint] = useState(false);
  const [name, setName] = useState("");
  const [freshKey, setFreshKey] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [origin, setOrigin] = useState("https://jenvu.com");
  const [deleteTarget, setDeleteTarget] = useState<ExtensionKeyRow | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") setOrigin(window.location.origin);
  }, []);

  const refresh = async () => {
    setLoading(true);
    try {
      const res = await load();
      if (res.ok) {
        setKeys(res.keys);
        setAccess(res.access);
      } else toast.error(res.error || "Could not load your keys");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not load your keys");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh(); /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, []);

  const onCreate = async () => {
    setCreating(true);
    try {
      const res = await create({ data: { name } });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setFreshKey(res.key);
      setName("");
      setShowCreate(false);
      toast.success("API key created — you can copy it anytime from the list.");
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
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
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
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
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
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = value;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        const copiedSuccessfully = document.execCommand("copy");
        textarea.remove();
        if (!copiedSuccessfully) throw new Error("Clipboard unavailable");
      }
      setCopied(id);
      toast.success("Full API key copied");
      setTimeout(() => setCopied(null), 1800);
    } catch {
      toast.error("Copy failed");
    }
  };

  const copyListedKey = async (key: ExtensionKeyRow) => {
    if (freshKey?.startsWith(key.key_prefix)) {
      await copyValue(freshKey, key.id);
      return;
    }
    try {
      const res = await reveal({ data: { id: key.id } });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      await copyValue(res.key, key.id);
    } catch {
      toast.error("Copy failed");
    }
  };

  const activeKeys = keys.filter((k) => !k.revoked_at);
  const q = query.trim().toLowerCase();
  const displayedKeys = [...keys]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .filter((k) => !q || k.name.toLowerCase().includes(q) || k.key_prefix.toLowerCase().includes(q));
  const canCreate = Boolean(
    access?.active && access.plan !== "free" && activeKeys.length < access.keyLimit,
  );
  const capabilities = getPlanCapabilities(access?.active ? access.plan : "free");

  return (
    <div className="mx-auto w-full max-w-[1100px] px-1 py-2 sm:px-2 sm:py-6">
      {/* Header row */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-[28px] font-medium tracking-tight text-foreground sm:text-[32px]">API keys</h1>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={() => setShowGuide((v) => !v)} className="console-pill hidden sm:inline-flex">
            <FileText className="h-4 w-4" /> Quickstart
          </button>
          <button onClick={() => setShowEndpoint((v) => !v)} className="console-pill hidden sm:inline-flex">
            <Terminal className="h-4 w-4" /> Endpoint
          </button>
          <button
            onClick={() => {
              setShowCreate(true);
              setFreshKey(null);
            }}
            disabled={!canCreate}
            className="console-pill console-pill-solid disabled:cursor-not-allowed disabled:opacity-45"
          >
            <Plus className="h-4 w-4" /> Create API key
          </button>
        </div>
      </div>
      {access && (
        <p className="mt-2 text-[14px] text-muted-foreground">
          {access.planName} plan · {activeKeys.length} of {access.keyLimit} keys active · AI wallet $
          {access.balance.toFixed(2)}
        </p>
      )}

      {!loading && access && !capabilities.extensionAi && (
        <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-4 text-[13px] text-amber-900">
          AI access is not included in your current plan. Upgrade to Pro, Elite, or Ultra to create
          keys and use AI analysis.
        </div>
      )}

      {/* Fresh key banner */}
      {freshKey && (
        <div className="mt-5 rounded-lg border border-amber-300 bg-amber-50 p-3">
          <div className="text-[12px] font-medium text-amber-800">
            Your new API key — you can copy it again later from the list below.
          </div>
          <div className="mt-2 flex items-center gap-2">
            <code
              className={`${MONO} flex-1 truncate rounded border border-amber-200 bg-white px-2 py-1.5 text-[12px] text-zinc-900`}
            >
              {freshKey}
            </code>
            <button
              onClick={() => copyValue(freshKey, "fresh")}
              className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-white px-2.5 py-1.5 text-[12px] text-amber-800 hover:bg-amber-100"
            >
              {copied === "fresh" ? (
                <Check className="h-3.5 w-3.5" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}{" "}
              Copy
            </button>
          </div>
        </div>
      )}

      {/* Public API endpoint drawer */}
      {showEndpoint && (
        <div className="mt-6 rounded-xl border border-zinc-200 bg-zinc-50 p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="text-[13px] font-medium text-zinc-900">Api endpoint</div>
              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                OpenAI-compatible
              </span>
            </div>
            <button
              onClick={() => setShowEndpoint(false)}
              className="rounded-full p-1 text-zinc-500 hover:bg-zinc-200"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <p className="mt-3 text-[12px] leading-relaxed text-zinc-600">
            Use your key anywhere — Claude Desktop, scripts, or any OpenAI-compatible client. Usage
            counts against your plan&apos;s daily token limit and appears on the Usage page.
          </p>
          <div className="mt-3 flex items-center gap-2">
            <code
              className={`${MONO} min-w-0 flex-1 truncate rounded-md border border-zinc-200 bg-zinc-50 px-2.5 py-2 text-[12px] text-zinc-900`}
            >
              {API_BASE}/chat/completions
            </code>
            <button
              type="button"
              onClick={() => copyValue(`${API_BASE}/chat/completions`, "endpoint")}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-2.5 py-2 text-[12px] text-zinc-700 hover:bg-zinc-50"
            >
              {copied === "endpoint" ? (
                <Check className="h-3.5 w-3.5" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
              Copy
            </button>
          </div>
          <pre
            className={`${MONO} mt-3 overflow-x-auto rounded-md border border-zinc-200 bg-zinc-50 p-3 text-[11.5px] leading-relaxed text-zinc-700`}
          >{`curl ${API_BASE}/chat/completions \\
  -H "Authorization: Bearer YOUR_JENVU_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"model":"claude-sonnet-4.5","messages":[{"role":"user","content":"XAU/USD bias today?"}]}'`}</pre>
          <p className="mt-2 text-[12px] text-zinc-500">
            Models: <span className={MONO}>claude-sonnet-4.5</span>,{" "}
            <span className={MONO}>claude-haiku-4.5</span>, <span className={MONO}>glm-5</span>.
            List them at <span className={MONO}>{API_BASE}/models</span>.
          </p>
        </div>
      )}

      {/* API key search + table (xAI console style) */}
      <div className="mt-6">
        <label className="console-card flex items-center gap-2 px-4 py-2.5">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search API keys"
            aria-label="Search API keys"
            className="min-w-0 flex-1 bg-transparent text-[14px] text-foreground outline-none placeholder:text-muted-foreground"
          />
        </label>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-[14px]">
            <thead>
              <tr className="text-[13px] text-muted-foreground">
                <th className="py-3 pr-4 font-normal">Name</th>
                <th className="py-3 pr-4 font-normal">Key</th>
                <th className="py-3 pr-4 font-normal">Created</th>
                <th className="py-3 pr-4 font-normal">Last used</th>
                <th className="py-3 pr-4 font-normal">Status</th>
                <th className="w-12 py-3" />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-muted-foreground">Loading…</td>
                </tr>
              ) : displayedKeys.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-muted-foreground">
                    No API keys found.
                  </td>
                </tr>
              ) : (
                displayedKeys.map((k) => (
                  <tr key={k.id} className="console-row">
                    <td className="py-3.5 pr-4 font-medium text-foreground">{k.name || "Untitled key"}</td>
                    <td className="py-3.5 pr-4">
                      <span className="inline-flex items-center gap-1.5">
                        <code className={`${MONO} text-[13px] text-foreground`}>{k.key_prefix}••••••••</code>
                        <button
                          type="button"
                          title="Copy full API key"
                          aria-label={`Copy full API key for ${k.name}`}
                          onClick={() => void copyListedKey(k)}
                          className="rounded p-1 text-muted-foreground hover:text-foreground"
                        >
                          {copied === k.id ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                        </button>
                      </span>
                    </td>
                    <td className="py-3.5 pr-4 text-foreground">
                      {new Date(k.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                    </td>
                    <td className="py-3.5 pr-4 text-muted-foreground">
                      {k.last_used_at ? new Date(k.last_used_at).toLocaleDateString() : "Never"}
                    </td>
                    <td className="py-3.5 pr-4">
                      <span className="console-badge">{k.revoked_at ? "Revoked" : "Active"}</span>
                    </td>
                    <td className="py-3.5 text-right">
                      <button
                        type="button"
                        title={k.revoked_at ? "Delete permanently" : "Revoke key"}
                        aria-label={k.revoked_at ? `Permanently delete ${k.name}` : `Revoke ${k.name}`}
                        onClick={() => (k.revoked_at ? setDeleteTarget(k) : void onRevoke(k.id))}
                        className="rounded-full p-2 text-muted-foreground hover:text-rose-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quickstart drawer */}
      {showGuide && (
        <div className="mt-6 rounded-xl border border-zinc-200 bg-zinc-50 p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="text-[13px] font-medium text-zinc-900">API quickstart</div>
            <button
              onClick={() => setShowGuide(false)}
              className="rounded-full p-1 text-zinc-500 hover:bg-zinc-200"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <p className="mt-3 text-[12px] leading-relaxed text-zinc-600">
            Usage is charged only for the tokens actually processed at $3 per 1,000,000 tokens. Your
            wallet balance and plan daily limit apply to chat and multi-market analysis on every
            paid plan.
          </p>
          <ol className="mt-3 space-y-2 text-[13px] leading-relaxed text-zinc-700">
            <li>1. Create an API key above and copy it once.</li>
            <li>
              2. Send it as{" "}
              <span className={`${MONO} rounded bg-white px-1.5 py-0.5 text-[12px]`}>
                Authorization: Bearer &lt;your key&gt;
              </span>
              .
            </li>
            <li>3. Call the endpoints below from your own tools or scripts.</li>
          </ol>
          <div
            className={`${MONO} mt-4 space-y-1 rounded-lg border border-zinc-200 bg-white p-3 text-[12px] text-zinc-700`}
          >
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
              <button
                onClick={() => setShowCreate(false)}
                className="rounded-full p-1 text-zinc-500 hover:bg-zinc-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-1 text-[13px] text-zinc-500">
              Give the key a name so you can recognise the device using it.
            </p>
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

      <ConfirmDialog
        open={!!deleteTarget}
        busy={deleting}
        title="Delete API key?"
        description={
          <>
            <span className="font-medium text-foreground">{deleteTarget?.name}</span> will be removed
            permanently. This can't be undone.
          </>
        }
        onCancel={() => setDeleteTarget(null)}
        onConfirm={onDelete}
      />
    </div>
  );
}
