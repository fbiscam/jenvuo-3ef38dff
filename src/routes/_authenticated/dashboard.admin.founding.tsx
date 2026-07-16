import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Search, Crown, Check, X, Clock } from "lucide-react";
import { isAdmin } from "@/lib/admin-messages.functions";
import {
  listFoundingApplications,
  updateFoundingApplication,
  type FoundingApplication,
} from "@/lib/founding.functions";

export const Route = createFileRoute("/_authenticated/dashboard/admin/founding")({
  head: () => ({
    meta: [
      { title: "Founding Applications — Admin" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminFoundingPage,
});

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-50 text-amber-700",
  approved: "bg-emerald-50 text-emerald-700",
  active: "bg-blue-50 text-blue-700",
  rejected: "bg-rose-50 text-rose-700",
  waitlisted: "bg-zinc-100 text-zinc-600",
  graduated: "bg-violet-50 text-violet-700",
};

function AdminFoundingPage() {
  const checkAdmin = useServerFn(isAdmin);
  const fetchList = useServerFn(listFoundingApplications);
  const update = useServerFn(updateFoundingApplication);

  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const [rows, setRows] = useState<FoundingApplication[]>([]);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  useEffect(() => {
    (async () => {
      try {
        const { admin } = await checkAdmin();
        setAllowed(admin);
        if (admin) setRows(await fetchList());
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to load");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (!needle) return true;
      return (
        r.email.toLowerCase().includes(needle) ||
        r.full_name.toLowerCase().includes(needle) ||
        (r.country || "").toLowerCase().includes(needle) ||
        (r.broker || "").toLowerCase().includes(needle)
      );
    });
  }, [rows, q, statusFilter]);

  async function changeStatus(id: string, status: string) {
    try {
      await update({ data: { id, status: status as any } });
      setRows((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
      toast.success(`Marked ${status}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    }
  }

  async function markProfit(id: string) {
    try {
      await update({ data: { id, status: "active", first_profit_reached: true } });
      setRows((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status: "active", first_profit_at: new Date().toISOString() } : r)),
      );
      toast.success("Marked $100 profit reached → active");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    }
  }

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    rows.forEach((r) => (c[r.status] = (c[r.status] || 0) + 1));
    return c;
  }, [rows]);

  if (loading) return <div className="p-8 text-sm text-zinc-500">Loading…</div>;
  if (!allowed) {
    return (
      <div className="p-8">
        <h1 className="text-lg font-semibold">Forbidden</h1>
        <p className="mt-2 text-sm text-zinc-500">Admin access required.</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2">
            <Crown className="h-5 w-5" /> Founding applications
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            {rows.length} total · {counts.pending || 0} pending · {counts.approved || 0} approved ·{" "}
            {counts.active || 0} active
          </p>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name, email, country, broker…"
            className="w-full rounded-lg border border-zinc-200 bg-white pl-9 pr-3 py-2 text-sm"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm"
        >
          <option value="all">All statuses</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="active">Active</option>
          <option value="waitlisted">Waitlisted</option>
          <option value="rejected">Rejected</option>
          <option value="graduated">Graduated</option>
        </select>
      </div>

      <div className="mt-4 space-y-3">
        {filtered.length === 0 && (
          <div className="rounded-2xl border border-zinc-200 bg-white p-8 text-center text-sm text-zinc-500">
            No applications match.
          </div>
        )}
        {filtered.map((r) => (
          <div key={r.id} className="rounded-2xl border border-zinc-200 bg-white p-4">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-zinc-900">{r.full_name}</span>
                  {r.requested_plan && (
                    <span className="inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-800">
                      Wants: {r.requested_plan}
                    </span>
                  )}
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${
                      STATUS_STYLES[r.status] || "bg-zinc-100 text-zinc-600"
                    }`}
                  >
                    {r.status}
                  </span>
                </div>
                <div className="mt-1 text-[13px] text-zinc-600">
                  <a href={`mailto:${r.email}`} className="underline">
                    {r.email}
                  </a>
                  {r.country && <> · {r.country}</>}
                  {r.broker && <> · {r.broker}</>}
                  {r.experience_years !== null && <> · {r.experience_years}y exp</>}
                  {r.monthly_volume_usd !== null && <> · ${r.monthly_volume_usd}/mo</>}
                </div>
                {r.why_joining && (
                  <p className="mt-2 text-[13px] text-zinc-700 whitespace-pre-wrap">{r.why_joining}</p>
                )}
                {r.myfxbook_url && (
                  <a
                    href={r.myfxbook_url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-block text-[12px] text-blue-600 underline"
                  >
                    Track record →
                  </a>
                )}
                <div className="mt-2 text-[11px] text-zinc-400 flex items-center gap-1">
                  <Clock className="h-3 w-3" /> {new Date(r.created_at).toLocaleString()}
                  {r.approved_at && <> · approved {new Date(r.approved_at).toLocaleDateString()}</>}
                  {r.first_profit_at && (
                    <> · profit {new Date(r.first_profit_at).toLocaleDateString()}</>
                  )}
                </div>
              </div>

              <div className="flex shrink-0 flex-wrap gap-1.5">
                {r.status === "pending" && (
                  <>
                    <button
                      onClick={() => changeStatus(r.id, "approved")}
                      className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-[12px] font-medium text-white hover:bg-emerald-700"
                    >
                      <Check className="h-3.5 w-3.5" /> Approve
                    </button>
                    <button
                      onClick={() => changeStatus(r.id, "waitlisted")}
                      className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-[12px] font-medium hover:bg-zinc-50"
                    >
                      Waitlist
                    </button>
                    <button
                      onClick={() => changeStatus(r.id, "rejected")}
                      className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-[12px] font-medium text-rose-600 hover:bg-rose-50"
                    >
                      <X className="h-3.5 w-3.5" /> Reject
                    </button>
                  </>
                )}
                {r.status === "approved" && (
                  <button
                    onClick={() => markProfit(r.id)}
                    className="inline-flex items-center gap-1 rounded-lg bg-zinc-900 px-2.5 py-1.5 text-[12px] font-medium text-white hover:bg-zinc-800"
                  >
                    Mark $100 profit → Active
                  </button>
                )}
                {(r.status === "approved" || r.status === "active") && (
                  <button
                    onClick={() => changeStatus(r.id, "graduated")}
                    className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-[12px] font-medium hover:bg-zinc-50"
                  >
                    Graduate
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
