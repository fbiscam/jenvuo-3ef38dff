import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Search, Users, Download } from "lucide-react";
import { isAdmin } from "@/lib/admin-messages.functions";
import {
  listNewsletterSubscribers,
  type NewsletterSubscriber,
} from "@/lib/admin-subscribers.functions";
import { OpsBadge, OpsPage, OpsState, OpsStats, ops } from "@/components/ops/OpsPage";

export const Route = createFileRoute("/_authenticated/dashboard/admin/subscribers")({
  head: () => ({
    meta: [
      { title: "Newsletter Subscribers — Jenvu Admin" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminSubscribersPage,
});

function AdminSubscribersPage() {
  const checkAdmin = useServerFn(isAdmin);
  const fetchList = useServerFn(listNewsletterSubscribers);

  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const [rows, setRows] = useState<NewsletterSubscriber[]>([]);
  const [q, setQ] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const { admin } = await checkAdmin();
        setAllowed(admin);
        if (admin) {
          const list = await fetchList();
          setRows(list);
        }
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to load");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter((r) => r.email.toLowerCase().includes(needle));
  }, [rows, q]);

  const active = rows.filter((r) => r.status === "active").length;

  const csvCell = (v: unknown) => {
    let s = String(v ?? "");
    if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
    return `"${s.replace(/"/g, '""')}"`;
  };

  const exportCsv = () => {
    const header = "email,status,subscribed_at\n";
    const body = filtered
      .map((r) => [r.email, r.status, r.subscribed_at].map(csvCell).join(","))
      .join("\n");
    const blob = new Blob([header + body], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `newsletter-subscribers-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return <OpsState title="Loading subscribers…" />;
  if (!allowed) return <OpsState title="Admin access required" description="Sign in with an admin account to view this page." />;

  return (
    <OpsPage
      title="Newsletter subscribers"
      description="Email list and signal opt-ins"
      icon={<Users />}
      actions={
        <button onClick={exportCsv} disabled={filtered.length === 0} className={ops.btn}>
          <Download className="h-4 w-4" /> Export CSV
        </button>
      }
    >
      <OpsStats
        items={[
          { label: "Total subscribers", value: rows.length },
          { label: "Active", value: active, tone: "success" },
          { label: "Unsubscribed", value: rows.length - active },
          { label: "Showing", value: filtered.length },
        ]}
      />
      <div className="border-b border-border px-4 py-3 sm:px-6">
        <div className="relative max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by email…" className={`${ops.input} pl-9`} />
        </div>
      </div>
      <div className={ops.tableWrap}>
        <table className={`min-w-[540px] ${ops.table}`}>
          <thead className={ops.thead}>
            <tr>
              <th className={ops.th}>Email</th>
              <th className={ops.th}>Status</th>
              <th className={ops.th}>Subscribed</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-12 text-center text-[13px] text-muted-foreground">
                  No subscribers yet.
                </td>
              </tr>
            )}
            {filtered.map((r) => (
              <tr key={r.id} className={ops.tr}>
                <td className={`${ops.td} font-medium text-foreground`}>{r.email}</td>
                <td className={ops.td}>
                  <OpsBadge tone={r.status === "active" ? "success" : "neutral"}>{r.status}</OpsBadge>
                </td>
                <td className={`${ops.td} text-muted-foreground`}>{new Date(r.subscribed_at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </OpsPage>
  );
}
