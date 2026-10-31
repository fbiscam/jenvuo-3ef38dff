import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Megaphone, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { isAdmin } from "@/lib/admin-messages.functions";
import { ANNOUNCEMENT_KINDS, type Announcement, type AnnouncementKind } from "@/lib/announcements";
import { OpsBadge, OpsPage, OpsSection, OpsState, OpsStats, ops } from "@/components/ops/OpsPage";
import { ConfirmDialog } from "@/components/ConfirmDialog";

export const Route = createFileRoute("/_authenticated/dashboard/admin/announcements")({
  head: () => ({
    meta: [
      { title: "Site Notices — Jenvu Admin" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminAnnouncementsPage,
});

const KIND_LABEL = Object.fromEntries(ANNOUNCEMENT_KINDS.map((k) => [k.value, k.label])) as Record<AnnouncementKind, string>;
const KIND_TONE = { update: "info", bot: "success", issue: "danger", maintenance: "warning" } as const;

function AdminAnnouncementsPage() {
  const checkAdmin = useServerFn(isAdmin);
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const [rows, setRows] = useState<Announcement[]>([]);
  const [saving, setSaving] = useState(false);
  const [toDelete, setToDelete] = useState<Announcement | null>(null);
  const [form, setForm] = useState({ kind: "update" as AnnouncementKind, title: "", body: "", link_url: "", link_label: "" });

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from("site_announcements")
      .select("id,kind,title,body,link_url,link_label,active,created_at")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) toast.error(error.message);
    setRows((data ?? []) as Announcement[]);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const { admin } = await checkAdmin();
        setAllowed(admin);
        if (admin) await load();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to load");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const publish = async () => {
    if (!form.title.trim()) return toast.error("Add a title");
    setSaving(true);
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("site_announcements").insert({
      kind: form.kind,
      title: form.title.trim(),
      body: form.body.trim() || null,
      link_url: form.link_url.trim() || null,
      link_label: form.link_label.trim() || null,
      created_by: u.user?.id ?? null,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Notice is live for every user");
    setForm({ kind: "update", title: "", body: "", link_url: "", link_label: "" });
    void load();
  };

  const toggle = async (a: Announcement) => {
    const { error } = await supabase.from("site_announcements").update({ active: !a.active }).eq("id", a.id);
    if (error) return toast.error(error.message);
    void load();
  };

  const remove = async () => {
    if (!toDelete) return;
    const { error } = await supabase.from("site_announcements").delete().eq("id", toDelete.id);
    setToDelete(null);
    if (error) return toast.error(error.message);
    void load();
  };

  if (loading) return <OpsState title="Loading notices…" />;
  if (!allowed) return <OpsState title="Admin access required" description="Sign in with an admin account to view this page." />;

  const live = rows.filter((r) => r.active).length;

  return (
    <OpsPage title="Site notices" description="Shown at the top of every user's dashboard until they dismiss it" icon={<Megaphone />}>
      <OpsStats
        items={[
          { label: "Live now", value: live, tone: "success" },
          { label: "Turned off", value: rows.length - live },
          { label: "Total", value: rows.length },
        ]}
      />
      <OpsSection title="New notice">
        <div className="grid max-w-3xl gap-3 sm:grid-cols-[180px_1fr]">
          <select
            value={form.kind}
            onChange={(e) => setForm({ ...form, kind: e.target.value as AnnouncementKind })}
            className={ops.input}
          >
            {ANNOUNCEMENT_KINDS.map((k) => (
              <option key={k.value} value={k.value}>{k.label}</option>
            ))}
          </select>
          <input
            value={form.title}
            maxLength={120}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="Title, e.g. Sign-up issue fixed"
            className={ops.input}
          />
          <input
            value={form.body}
            maxLength={400}
            onChange={(e) => setForm({ ...form, body: e.target.value })}
            placeholder="Short message (optional)"
            className={`${ops.input} sm:col-span-2`}
          />
          <input
            value={form.link_url}
            maxLength={300}
            onChange={(e) => setForm({ ...form, link_url: e.target.value })}
            placeholder="Button link (optional), e.g. /dashboard/jx-bot"
            className={ops.input}
          />
          <input
            value={form.link_label}
            maxLength={40}
            onChange={(e) => setForm({ ...form, link_label: e.target.value })}
            placeholder="Button text, e.g. Get update"
            className={ops.input}
          />
        </div>
        <button type="button" onClick={() => void publish()} disabled={saving} className={`${ops.btnPrimary} mt-3`}>
          {saving ? "Publishing…" : "Publish notice"}
        </button>
      </OpsSection>
      <div className={ops.tableWrap}>
        <table className={`min-w-[640px] ${ops.table}`}>
          <thead className={ops.thead}>
            <tr>
              <th className={ops.th}>Type</th>
              <th className={ops.th}>Title</th>
              <th className={ops.th}>Posted</th>
              <th className={ops.th}>Status</th>
              <th className={ops.th} />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-[13px] text-muted-foreground">No notices yet.</td>
              </tr>
            )}
            {rows.map((r) => (
              <tr key={r.id} className={ops.tr}>
                <td className={ops.td}><OpsBadge tone={KIND_TONE[r.kind]}>{KIND_LABEL[r.kind]}</OpsBadge></td>
                <td className={`${ops.td} max-w-[320px] truncate`} title={r.body ?? ""}>{r.title}</td>
                <td className={`${ops.td} text-muted-foreground`}>{new Date(r.created_at).toLocaleString()}</td>
                <td className={ops.td}>
                  <button type="button" onClick={() => void toggle(r)} className={ops.btn}>
                    {r.active ? "Live — turn off" : "Off — turn on"}
                  </button>
                </td>
                <td className={ops.td}>
                  <button type="button" onClick={() => setToDelete(r)} aria-label="Delete notice" className="text-gc-red">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ConfirmDialog
        open={!!toDelete}
        title="Delete this notice?"
        description="It disappears for every user."
        confirmLabel="Delete"
        onConfirm={() => void remove()}
        onCancel={() => setToDelete(null)}
      />
    </OpsPage>
  );
}
