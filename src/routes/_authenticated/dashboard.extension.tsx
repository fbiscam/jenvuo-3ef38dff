import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Copy, Check, KeyRound, Puzzle, Trash2, Plus, ShieldCheck, Download } from "lucide-react";
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
      { title: "Browser Extension — Jenvu" },
      { name: "description", content: "Install the Jenvu XAU/USD ICT/SMC extension and create the API key it signs in with." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ExtensionPage,
});

function Card({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
      <header className="flex items-center gap-2 border-b border-zinc-200 bg-zinc-50 px-4 py-2.5">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-rose-400" />
          <span className="h-2 w-2 rounded-full bg-amber-400" />
          <span className="h-2 w-2 rounded-full bg-emerald-400" />
        </span>
        <span className="ml-2 flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-zinc-600">
          {icon}
          {title}
        </span>
      </header>
      <div className="p-4">{children}</div>
    </section>
  );
}

function ExtensionPage() {
  const load = useServerFn(listExtensionKeys);
  const create = useServerFn(createExtensionKey);
  const revoke = useServerFn(revokeExtensionKey);

  const [keys, setKeys] = useState<ExtensionKeyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [freshKey, setFreshKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [origin, setOrigin] = useState("https://jenvu.com");

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

  const copyKey = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast.success("Copied");
      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error("Copy failed");
    }
  };

  const activeKeys = keys.filter((k) => !k.revoked_at);

  return (
    <div className="space-y-5">
      <header className="rounded-xl border border-zinc-200 bg-white p-5">
        <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-zinc-500">
          <Puzzle className="h-3.5 w-3.5" /> Browser extension
        </div>
        <h1 className="mt-2 text-xl font-semibold text-zinc-900">Jenvu XAU/USD Analyst Extension</h1>
        <p className="mt-1.5 max-w-2xl text-[13px] leading-relaxed text-zinc-600">
          The extension runs the same ICT/SMC engine as your dashboard: live gold price, market structure,
          liquidity, order blocks and an AI second review — straight from your browser toolbar. Install it,
          create a key below, paste the key into the extension and you are signed in.
        </p>
      </header>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card title="Step 1 — Install" icon={<Download className="h-3.5 w-3.5" />}>
          <ol className="space-y-2.5 text-[13px] leading-relaxed text-zinc-700">
            <li><span className="font-medium text-zinc-900">1.</span> Download the extension package and unzip it on your computer.</li>
            <li><span className="font-medium text-zinc-900">2.</span> Open <span className={`${MONO} rounded bg-zinc-100 px-1.5 py-0.5 text-[12px]`}>chrome://extensions</span> in Chrome, Edge or Brave.</li>
            <li><span className="font-medium text-zinc-900">3.</span> Turn on <span className="font-medium">Developer mode</span> (top-right toggle).</li>
            <li><span className="font-medium text-zinc-900">4.</span> Click <span className="font-medium">Load unpacked</span> and select the unzipped folder.</li>
            <li><span className="font-medium text-zinc-900">5.</span> Pin the Jenvu icon to your toolbar and open it.</li>
          </ol>
          <p className="mt-3 text-[12px] text-zinc-500">
            The extension only talks to <span className={MONO}>{origin}</span>. It never stores your password — only the key you paste.
          </p>
        </Card>

        <Card title="Step 2 — Create your API key" icon={<KeyRound className="h-3.5 w-3.5" />}>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Key name (e.g. My laptop)"
              className="flex-1 rounded-lg border border-zinc-200 px-3 py-2 text-[13px] outline-none focus:border-zinc-400"
            />
            <button
              onClick={onCreate}
              disabled={creating}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-zinc-900 px-3.5 py-2 text-[13px] font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
            >
              <Plus className="h-3.5 w-3.5" /> {creating ? "Creating…" : "Create key"}
            </button>
          </div>

          {freshKey && (
            <div className="mt-3 rounded-lg border border-amber-300 bg-amber-50 p-3">
              <div className="text-[12px] font-medium text-amber-800">Copy this key now — it will not be shown again.</div>
              <div className="mt-2 flex items-center gap-2">
                <code className={`${MONO} flex-1 truncate rounded bg-white px-2 py-1.5 text-[12px] text-zinc-900 border border-amber-200`}>{freshKey}</code>
                <button
                  onClick={() => copyKey(freshKey)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-white px-2.5 py-1.5 text-[12px] text-amber-800 hover:bg-amber-100"
                >
                  {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />} Copy
                </button>
              </div>
            </div>
          )}

          <div className="mt-4">
            <div className="mb-2 text-[11px] uppercase tracking-wider text-zinc-500">Your keys</div>
            {loading ? (
              <div className="text-[13px] text-zinc-500">Loading…</div>
            ) : keys.length === 0 ? (
              <div className="rounded-lg border border-dashed border-zinc-200 p-4 text-[13px] text-zinc-500">
                No keys yet. Create one above to sign the extension in.
              </div>
            ) : (
              <ul className="divide-y divide-zinc-100 rounded-lg border border-zinc-200">
                {keys.map((k) => (
                  <li key={k.id} className="flex items-center gap-3 px-3 py-2.5">
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[13px] font-medium text-zinc-900">{k.name}</div>
                      <div className={`${MONO} truncate text-[11px] text-zinc-500`}>
                        {k.key_prefix}••••••••
                        {k.last_used_at ? ` · last used ${new Date(k.last_used_at).toLocaleDateString()}` : " · never used"}
                      </div>
                    </div>
                    {k.revoked_at ? (
                      <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] text-zinc-500">Revoked</span>
                    ) : (
                      <button
                        onClick={() => onRevoke(k.id)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 px-2.5 py-1.5 text-[12px] text-rose-600 hover:bg-rose-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Revoke
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-2 text-[12px] text-zinc-500">{activeKeys.length} active key(s) · maximum 5.</div>
          </div>
        </Card>
      </div>

      <Card title="Step 3 — Sign in inside the extension" icon={<ShieldCheck className="h-3.5 w-3.5" />}>
        <ol className="space-y-2.5 text-[13px] leading-relaxed text-zinc-700">
          <li><span className="font-medium text-zinc-900">1.</span> Open the Jenvu extension from your toolbar.</li>
          <li><span className="font-medium text-zinc-900">2.</span> Paste your key into the <span className="font-medium">API key</span> field and press <span className="font-medium">Connect</span>.</li>
          <li><span className="font-medium text-zinc-900">3.</span> The extension checks the key and shows your account email — you are now signed in.</li>
          <li><span className="font-medium text-zinc-900">4.</span> Press <span className="font-medium">Analyze XAU/USD</span> for a live ICT/SMC read with AI second review.</li>
        </ol>

        <div className="mt-4 rounded-lg border border-zinc-200 bg-zinc-50 p-3">
          <div className="text-[11px] uppercase tracking-wider text-zinc-500">Endpoints used by the extension</div>
          <div className={`${MONO} mt-2 space-y-1 text-[12px] text-zinc-700`}>
            <div>POST {origin}/api/public/extension/verify</div>
            <div>POST {origin}/api/public/extension/analyze</div>
            <div className="text-zinc-500">Header: Authorization: Bearer &lt;your key&gt;</div>
          </div>
        </div>

        <p className="mt-3 text-[12px] text-zinc-500">
          Lost a key or changed computer? Revoke it above and create a new one — the old key stops working immediately.
        </p>
      </Card>
    </div>
  );
}
