import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ToolsShell, ToolCard } from "@/components/ToolsShell";
import { toolsLogin, toolsLogout, toolsMe } from "@/lib/tools-auth.functions";
import { runLeadSearch, listLeadHistory, type Lead } from "@/lib/leads.functions";
import { Loader2, Download, LogOut, Search } from "lucide-react";

export const Route = createFileRoute("/tools/leads")({
  head: () => ({
    meta: [
      { title: "Google Maps Leads Generation Tool | Jenvu" },
      {
        name: "description",
        content:
          "Extract business leads from Google Maps: name, phone, email, address, rating, website and map URL, enriched with Apollo. Export to CSV.",
      },
      { property: "og:title", content: "Leads Generation Tool — Jenvu" },
      { property: "og:description", content: "Pull verified business leads from Google Maps and enrich them with Apollo." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: LeadsTool,
});

type Me = Awaited<ReturnType<typeof toolsMe>>;

function csvEscape(v: unknown): string {
  const s = v === null || v === undefined ? "" : String(v);
  return `"${s.replace(/"/g, '""')}"`;
}

function LeadsTool() {
  const login = useServerFn(toolsLogin);
  const logout = useServerFn(toolsLogout);
  const me = useServerFn(toolsMe);
  const search = useServerFn(runLeadSearch);
  const history = useServerFn(listLeadHistory);

  const [session, setSession] = useState<Me | null>(null);
  const [checking, setChecking] = useState(true);

  const refreshSession = useCallback(async () => {
    try {
      const s = await me();
      setSession(s);
    } catch {
      setSession({ signedIn: false } as Me);
    } finally {
      setChecking(false);
    }
  }, [me]);

  useEffect(() => {
    void refreshSession();
  }, [refreshSession]);

  if (checking) {
    return (
      <ToolsShell title="Leads Generation">
        <ToolCard>
          <div className="flex items-center gap-2 text-zinc-500">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        </ToolCard>
      </ToolsShell>
    );
  }

  if (!session?.signedIn) {
    return <LoginCard onDone={refreshSession} login={login} />;
  }

  return (
    <LeadsDashboard
      session={session}
      search={search}
      history={history}
      onLogout={async () => {
        await logout({});
        await refreshSession();
      }}
      refreshSession={refreshSession}
    />
  );
}

function LoginCard({
  onDone,
  login,
}: {
  onDone: () => Promise<void>;
  login: ReturnType<typeof useServerFn<typeof toolsLogin>>;
}) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const res = await login({ data: { username, password } });
      if (res.ok) await onDone();
      else setErr("Invalid username or password");
    } catch {
      setErr("Something went wrong. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <ToolsShell
      eyebrow="Restricted tool"
      title="Leads Generation"
      intro="This tool is available to approved accounts only. Sign in with the credentials issued to you."
    >
      <div className="mx-auto max-w-md">
        <ToolCard>
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-[13px] text-zinc-600">User ID</label>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                className="w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-[15px] outline-none focus:border-zinc-400"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[13px] text-zinc-600">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                className="w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-[15px] outline-none focus:border-zinc-400"
              />
            </div>
            {err && <p className="text-[13px] text-red-600">{err}</p>}
            <button
              type="submit"
              disabled={busy}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-zinc-900 px-4 py-2.5 text-[15px] text-white disabled:opacity-60"
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin" />} Sign in
            </button>
          </form>
        </ToolCard>
      </div>
    </ToolsShell>
  );
}

function LeadsDashboard({
  session,
  search,
  history,
  onLogout,
  refreshSession,
}: {
  session: Me;
  search: ReturnType<typeof useServerFn<typeof runLeadSearch>>;
  history: ReturnType<typeof useServerFn<typeof listLeadHistory>>;
  onLogout: () => Promise<void>;
  refreshSession: () => Promise<void>;
}) {
  const [query, setQuery] = useState("");
  const [limit, setLimit] = useState(20);
  const [enrich, setEnrich] = useState(true);
  const [busy, setBusy] = useState(false);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [rows, setRows] = useState<Array<{ id: string; query: string; results_count: number; credits_spent: number; created_at: string }>>([]);

  const credits = (session as { credits?: number }).credits;
  const isOps = (session as { ops?: boolean }).ops === true;

  const loadHistory = useCallback(async () => {
    try {
      const r = await history({});
      setRows((r.rows ?? []) as typeof rows);
    } catch {
      /* ignore */
    }
  }, [history]);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  const cost = useMemo(() => Math.ceil(limit / 10), [limit]);

  async function run(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setBusy(true);
    setMsg(null);
    try {
      const res = await search({ data: { query, limit, enrich } });
      if (!res.ok) {
        setMsg(
          res.error === "NOT_CONFIGURED"
            ? "Google Places API key is not configured yet."
            : res.error === "INSUFFICIENT_CREDITS"
            ? `Not enough credits. This search needs ${(res as { needed?: number }).needed} credits.`
            : res.error === "UNAUTHORIZED"
            ? "Session expired — sign in again."
            : (res as { message?: string }).message ?? "Search failed.",
        );
        setLeads([]);
      } else {
        setLeads(res.leads);
        setMsg(res.leads.length ? null : "No results for that query.");
        await Promise.all([refreshSession(), loadHistory()]);
      }
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Search failed.");
    } finally {
      setBusy(false);
    }
  }

  function exportCsv() {
    const header = ["Name", "Phone", "Email", "Address", "Rating", "Reviews", "Website", "Google Maps URL", "Category", "Contact", "Title", "LinkedIn"];
    const lines = [header.map(csvEscape).join(",")];
    for (const l of leads) {
      lines.push(
        [l.name, l.phone, l.email, l.address, l.rating, l.reviews, l.website, l.mapsUrl, l.category, l.contactName, l.contactTitle, l.linkedin]
          .map(csvEscape)
          .join(","),
      );
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `jenvu-leads-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <ToolsShell
      eyebrow="Leads Generation"
      title="Google Maps lead extractor"
      intro="Search any business type and location. Results include phone, address, rating and map link — with Apollo email enrichment where available."
      right={
        <div className="flex items-center gap-3">
          <div className="rounded-full border border-zinc-200 bg-white px-3.5 py-2 text-[13px]">
            <span className="text-zinc-500">Credits</span>{" "}
            <span className="font-semibold">{isOps ? "∞" : Number(credits ?? 0).toFixed(0)}</span>
          </div>
          {!isOps && (
            <button
              type="button"
              onClick={onLogout}
              className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-3.5 py-2 text-[13px] text-zinc-700 hover:bg-zinc-50"
            >
              <LogOut className="h-3.5 w-3.5" /> Sign out
            </button>
          )}
        </div>
      }
    >
      <ToolCard>
        <form onSubmit={run} className="grid gap-3 md:grid-cols-[1fr_auto_auto_auto] md:items-end">
          <div>
            <label className="mb-1.5 block text-[13px] text-zinc-600">Search query</label>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="dentists in Dubai Marina"
              className="w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-[15px] outline-none focus:border-zinc-400"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-[13px] text-zinc-600">Results</label>
            <select
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
              className="rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-[15px] outline-none focus:border-zinc-400"
            >
              {[10, 20, 40, 60].map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>
          <label className="flex items-center gap-2 pb-2.5 text-[13px] text-zinc-700">
            <input type="checkbox" checked={enrich} onChange={(e) => setEnrich(e.target.checked)} className="h-4 w-4" />
            Apollo enrich
          </label>
          <button
            type="submit"
            disabled={busy}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-zinc-900 px-5 py-2.5 text-[15px] text-white disabled:opacity-60"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            Search
          </button>
        </form>
        <p className="mt-3 text-[12px] text-zinc-500">
          Cost: {isOps ? "free (ops)" : `${cost} credit${cost > 1 ? "s" : ""}`} · 1 credit per 10 leads
        </p>
        {msg && <p className="mt-3 text-[13px] text-red-600">{msg}</p>}
      </ToolCard>

      {leads.length > 0 && (
        <div className="mt-5">
          <ToolCard className="p-0 sm:p-0">
            <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-3.5">
              <p className="text-[14px] font-medium">{leads.length} leads</p>
              <button
                type="button"
                onClick={exportCsv}
                className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 px-3.5 py-1.5 text-[13px] hover:bg-zinc-50"
              >
                <Download className="h-3.5 w-3.5" /> CSV
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left text-[13px]">
                <thead className="bg-zinc-50 text-zinc-500">
                  <tr>
                    {["Business", "Phone", "Email", "Address", "Rating", "Website", "Maps"].map((h) => (
                      <th key={h} className="whitespace-nowrap px-4 py-2.5 font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {leads.map((l, i) => (
                    <tr key={`${l.name}-${i}`} className="border-t border-zinc-100 align-top">
                      <td className="px-4 py-2.5">
                        <div className="font-medium text-zinc-900">{l.name}</div>
                        {l.category && <div className="text-[12px] text-zinc-500">{l.category}</div>}
                        {l.contactName && <div className="text-[12px] text-zinc-500">{l.contactName} · {l.contactTitle}</div>}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5">{l.phone ?? "—"}</td>
                      <td className="px-4 py-2.5">{l.email ?? "—"}</td>
                      <td className="max-w-[260px] px-4 py-2.5 text-zinc-600">{l.address ?? "—"}</td>
                      <td className="whitespace-nowrap px-4 py-2.5">
                        {l.rating != null ? `${l.rating} (${l.reviews ?? 0})` : "—"}
                      </td>
                      <td className="max-w-[180px] truncate px-4 py-2.5">
                        {l.website ? (
                          <a href={l.website} target="_blank" rel="noreferrer" className="text-zinc-900 underline underline-offset-2">
                            {l.website.replace(/^https?:\/\//, "").slice(0, 28)}
                          </a>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5">
                        {l.mapsUrl ? (
                          <a href={l.mapsUrl} target="_blank" rel="noreferrer" className="text-zinc-900 underline underline-offset-2">
                            Open
                          </a>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </ToolCard>
        </div>
      )}

      {rows.length > 0 && (
        <div className="mt-5">
          <ToolCard>
            <p className="mb-3 text-[14px] font-medium">Recent searches</p>
            <div className="space-y-2">
              {rows.map((r) => (
                <div key={r.id} className="flex items-center justify-between rounded-xl bg-zinc-50 px-3.5 py-2.5 text-[13px]">
                  <span className="truncate text-zinc-800">{r.query}</span>
                  <span className="shrink-0 text-zinc-500">
                    {r.results_count} leads · {Number(r.credits_spent)} cr ·{" "}
                    {new Date(r.created_at).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          </ToolCard>
        </div>
      )}
    </ToolsShell>
  );
}
