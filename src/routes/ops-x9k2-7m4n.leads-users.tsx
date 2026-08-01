import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useState } from "react";
import { adminListToolUsers, adminCreateToolUser, adminUpdateToolUser } from "@/lib/tool-admin.functions";
import { Loader2, Plus, Trash2 } from "lucide-react";

export const Route = createFileRoute("/ops-x9k2-7m4n/leads-users")({
  head: () => ({
    meta: [
      { title: "Ops Console · Leads Tool Users" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: LeadsUsersAdmin,
});

type ToolUser = {
  id: string;
  username: string;
  display_name: string | null;
  credits: number;
  active: boolean;
  created_at: string;
  last_login_at: string | null;
};

type SearchRow = {
  id: string;
  tool_user_id: string;
  query: string;
  results_count: number;
  credits_spent: number;
  created_at: string;
};

const SANS = "font-['Google_Sans','Product_Sans','Poppins',system-ui,sans-serif]";
const CARD =
  "rounded-[22px] border border-zinc-200/70 bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04),0_12px_28px_-12px_rgba(16,24,40,0.10)] ring-1 ring-white/60 sm:p-6";

function LeadsUsersAdmin() {
  const list = useServerFn(adminListToolUsers);
  const create = useServerFn(adminCreateToolUser);
  const update = useServerFn(adminUpdateToolUser);

  const [users, setUsers] = useState<ToolUser[]>([]);
  const [searches, setSearches] = useState<SearchRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [form, setForm] = useState({ username: "", password: "", displayName: "", credits: 50 });
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await list({});
      setUsers((res.users ?? []) as ToolUser[]);
      setSearches((res.searches ?? []) as SearchRow[]);
      setErr(null);
    } catch {
      setErr("Ops session required. Unlock the console first.");
    } finally {
      setLoading(false);
    }
  }, [list]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await create({ data: form });
      if (!res.ok) setErr(res.error ?? "Could not create user");
      else {
        setForm({ username: "", password: "", displayName: "", credits: 50 });
        setErr(null);
        await load();
      }
    } finally {
      setBusy(false);
    }
  }

  async function patch(id: string, data: Parameters<typeof adminUpdateToolUser>[0] extends never ? never : Record<string, unknown>) {
    await update({ data: { id, ...data } as never });
    await load();
  }

  return (
    <div className={`min-h-dvh w-full bg-[#FAFAFA] text-zinc-900 ${SANS} antialiased`}>
      <main className="mx-auto max-w-6xl px-5 py-8 sm:px-6">
        <h1 className="text-2xl font-semibold tracking-tight">Leads Tool Users</h1>
        <p className="mt-1.5 text-[14px] text-zinc-600">Create accounts, top up credits and review lead searches.</p>

        {err && <p className="mt-4 text-[13px] text-red-600">{err}</p>}

        <div className={`mt-6 ${CARD}`}>
          <p className="mb-4 flex items-center gap-1.5 text-[15px] font-semibold">
            <Plus className="h-4 w-4" /> New user
          </p>
          <form onSubmit={onCreate} className="grid gap-3 sm:grid-cols-[1fr_1fr_1fr_120px_auto] sm:items-end">
            {([
              ["username", "User ID", "text"],
              ["password", "Password", "text"],
              ["displayName", "Name (optional)", "text"],
            ] as const).map(([key, label, type]) => (
              <div key={key}>
                <label className="mb-1.5 block text-[13px] text-zinc-600">{label}</label>
                <input
                  type={type}
                  value={form[key]}
                  onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))}
                  className="w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-[14px] outline-none focus:border-zinc-400"
                />
              </div>
            ))}
            <div>
              <label className="mb-1.5 block text-[13px] text-zinc-600">Credits</label>
              <input
                type="number"
                min={0}
                value={form.credits}
                onChange={(e) => setForm((p) => ({ ...p, credits: Number(e.target.value) }))}
                className="w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-[14px] outline-none focus:border-zinc-400"
              />
            </div>
            <button
              type="submit"
              disabled={busy}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-zinc-900 px-5 py-2.5 text-[14px] text-white disabled:opacity-60"
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin" />} Create
            </button>
          </form>
        </div>

        <div className={`mt-5 ${CARD}`}>
          <p className="mb-4 text-[15px] font-semibold">Accounts</p>
          {loading ? (
            <div className="flex items-center gap-2 text-[14px] text-zinc-500">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </div>
          ) : users.length === 0 ? (
            <p className="text-[14px] text-zinc-500">No tool users yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-[13px]">
                <thead className="bg-zinc-50 text-zinc-500">
                  <tr>
                    {["User", "Credits", "Status", "Last login", "Actions"].map((h) => (
                      <th key={h} className="whitespace-nowrap px-4 py-2.5 font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} className="border-t border-zinc-100">
                      <td className="px-4 py-3">
                        <div className="font-medium text-zinc-900">{u.username}</div>
                        {u.display_name && <div className="text-[12px] text-zinc-500">{u.display_name}</div>}
                      </td>
                      <td className="px-4 py-3 font-medium">{Number(u.credits).toFixed(0)}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2.5 py-1 text-[11px] ${u.active ? "bg-emerald-50 text-emerald-700" : "bg-zinc-100 text-zinc-500"}`}>
                          {u.active ? "active" : "disabled"}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-zinc-500">
                        {u.last_login_at ? new Date(u.last_login_at).toLocaleString() : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {[10, 50, 100].map((n) => (
                            <button
                              key={n}
                              type="button"
                              onClick={() => patch(u.id, { creditsDelta: n })}
                              className="rounded-full border border-zinc-200 px-2.5 py-1 text-[12px] hover:bg-zinc-50"
                            >
                              +{n}
                            </button>
                          ))}
                          <button
                            type="button"
                            onClick={() => patch(u.id, { active: !u.active })}
                            className="rounded-full border border-zinc-200 px-2.5 py-1 text-[12px] hover:bg-zinc-50"
                          >
                            {u.active ? "Disable" : "Enable"}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const pw = window.prompt("New password (min 6 chars)");
                              if (pw && pw.length >= 6) void patch(u.id, { newPassword: pw });
                            }}
                            className="rounded-full border border-zinc-200 px-2.5 py-1 text-[12px] hover:bg-zinc-50"
                          >
                            Reset pass
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm(`Delete ${u.username}?`)) void patch(u.id, { remove: true });
                            }}
                            className="inline-flex items-center gap-1 rounded-full border border-red-200 px-2.5 py-1 text-[12px] text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="h-3 w-3" /> Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className={`mt-5 ${CARD}`}>
          <p className="mb-4 text-[15px] font-semibold">Recent lead searches</p>
          {searches.length === 0 ? (
            <p className="text-[14px] text-zinc-500">No searches yet.</p>
          ) : (
            <div className="space-y-2">
              {searches.map((s) => (
                <div key={s.id} className="flex items-center justify-between rounded-xl bg-zinc-50 px-3.5 py-2.5 text-[13px]">
                  <span className="truncate text-zinc-800">{s.query}</span>
                  <span className="shrink-0 text-zinc-500">
                    {s.results_count} leads · {Number(s.credits_spent)} cr · {new Date(s.created_at).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
