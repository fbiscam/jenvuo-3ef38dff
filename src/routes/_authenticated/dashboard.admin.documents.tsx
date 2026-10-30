import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Check, X, Clock, FileImage, FileVideo, FileText, HelpCircle } from "lucide-react";
import {
  adminListDocumentSubmissions,
  adminUpdateDocumentStatus,
  type AdminDocSubmission,
} from "@/lib/founding.functions";
import { OpsPage, OpsStats, OpsTab } from "@/components/ops/OpsPage";

export const Route = createFileRoute("/_authenticated/dashboard/admin/documents")({
  head: () => ({
    meta: [
      { title: "Identity verification submissions — Admin" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminDocumentsPage,
});

const STATUS_BADGES: Record<string, string> = {
  received: "bg-gc-sky text-gc-blue-deep border-gc-blue-soft",
  pending: "bg-gc-yellow-soft text-gc-amber border-gc-yellow",
  needs_info: "bg-gc-sky text-gc-blue-deep border-gc-blue-soft",
  verified: "bg-gc-green-soft text-gc-success border-gc-success/30",
  rejected: "bg-gc-red-soft text-gc-red border-gc-red/30",
};

function FilePreview({ file }: { file: AdminDocSubmission["files"][number] }) {
  const url = file.signed_url ?? undefined;
  const mime = file.mime_type;
  if (mime.startsWith("image/") && url) {
    return (
      <a href={url} target="_blank" rel="noreferrer" className="block group">
        <img
          src={url}
          alt={file.original_name || "proof"}
          className="h-40 w-full object-cover rounded-lg border border-border group-hover:opacity-90"
          loading="lazy"
        />
      </a>
    );
  }
  if (mime.startsWith("video/") && url) {
    return (
      <video
        src={url}
        controls
        className="h-40 w-full object-cover rounded-lg border border-border bg-muted"
        preload="metadata"
      />
    );
  }
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="h-40 w-full flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-muted/50 text-muted-foreground text-xs gap-2 hover:bg-muted"
    >
      <FileText className="h-8 w-8" />
      Open file
    </a>
  );
}

function FileTypeIcon({ mime }: { mime: string }) {
  if (mime.startsWith("image/")) return <FileImage className="h-3.5 w-3.5" />;
  if (mime.startsWith("video/")) return <FileVideo className="h-3.5 w-3.5" />;
  return <FileText className="h-3.5 w-3.5" />;
}

function AdminDocumentsPage() {
  const qc = useQueryClient();
  const fetchList = useServerFn(adminListDocumentSubmissions);
  const update = useServerFn(adminUpdateDocumentStatus);
  const [filter, setFilter] = useState<string>("all");
  const [rejectFor, setRejectFor] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [infoFor, setInfoFor] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState("");

  const { data: rows = [], isLoading, error } = useQuery<AdminDocSubmission[]>({
    queryKey: ["admin-doc-submissions"],
    queryFn: () => fetchList({ data: undefined as any } as any),
    refetchOnWindowFocus: false,
  });

  const mut = useMutation({
    mutationFn: (input: {
      id: string;
      status: "verified" | "pending" | "rejected" | "needs_info";
      reason?: string;
      info?: string;
    }) =>
      update({
        data: {
          id: input.id,
          document_status: input.status,
          rejected_reason: input.reason,
          info_request: input.info,
        },
      } as any),
    onSuccess: (_r, vars) => {
      toast.success(
        vars.status === "verified"
          ? "Approved — user is now verified"
          : vars.status === "rejected"
          ? "Rejected"
          : vars.status === "needs_info"
          ? "Info request sent to user"
          : "Marked as under review",
      );
      setRejectFor(null);
      setReason("");
      setInfoFor(null);
      setInfoMsg("");
      qc.invalidateQueries({ queryKey: ["admin-doc-submissions"] });
    },
    onError: (e: any) => {
      console.error("[admin-docs] update failed", e);
      toast.error(e?.message || "Failed to update — check console");
    },
  });

  const filtered = filter === "all" ? rows : rows.filter((r) => r.document_status === filter);

  return (
    <OpsPage
      title="Document submissions"
      description="Review ID and driving license uploads, then approve or reject"
      icon={<FileText />}
      tabs={["all", "received", "pending", "needs_info", "verified", "rejected"].map((s) => (
        <OpsTab key={s} active={filter === s} onClick={() => setFilter(s)}>
          <span className="capitalize">{s.replace("_", " ")}</span>
          {s !== "all" && (
            <span className="ml-1.5 tabular-nums text-muted-foreground">
              {rows.filter((r) => r.document_status === s).length}
            </span>
          )}
        </OpsTab>
      ))}
    >
      <OpsStats
        items={[
          { label: "Submissions", value: rows.length },
          { label: "Awaiting review", value: rows.filter((r) => r.document_status === "received" || r.document_status === "pending").length, tone: "warning" },
          { label: "Need info", value: rows.filter((r) => r.document_status === "needs_info").length, tone: "info" },
          { label: "Verified", value: rows.filter((r) => r.document_status === "verified").length, tone: "success" },
          { label: "Rejected", value: rows.filter((r) => r.document_status === "rejected").length, tone: "danger" },
        ]}
      />
      <div className="px-4 py-5 sm:px-6">
      {isLoading ? (
        <div className="rounded-xl border border-border bg-background p-6 text-sm text-muted-foreground">Loading…</div>
      ) : error ? (
        <div className="rounded-2xl border border-gc-red/30 bg-gc-red-soft p-6 text-sm text-gc-red">
          {(error as Error).message}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-border bg-background p-6 text-sm text-muted-foreground">
          No submissions yet.
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((row) => (
            <div key={row.application_id} className="rounded-xl border border-border bg-background p-5 transition hover:border-gc-blue-soft hover:shadow-sm">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <div className="text-sm font-semibold text-foreground">{row.full_name}</div>
                  {row.profile_full_name && row.profile_full_name.trim() && (
                    <div className="text-[11px] text-muted-foreground">
                      Profile name: <span className="text-foreground font-medium">{row.profile_full_name}</span>
                    </div>
                  )}
                  <div className="text-xs text-muted-foreground">{row.email}</div>

                  <div className="text-[11px] text-muted-foreground mt-1">
                    Plan requested: <span className="text-foreground uppercase">{row.requested_plan || "—"}</span> ·
                    Submitted{" "}
                    {row.documents_submitted_at
                      ? new Date(row.documents_submitted_at).toLocaleString()
                      : "—"}
                  </div>
                </div>
                <span
                  className={[
                    "text-[11px] font-semibold px-2 py-1 rounded-full border capitalize",
                    STATUS_BADGES[row.document_status] || "bg-muted/50 text-foreground border-border",
                  ].join(" ")}
                >
                  {row.document_status}
                </span>
              </div>

              {row.documents_note && (
                <div className="mt-3 text-xs text-muted-foreground bg-muted/50 rounded-lg p-3">
                  <span className="font-semibold text-foreground">Note: </span>
                  {row.documents_note}
                </div>
              )}
              {row.document_status === "rejected" && row.documents_rejected_reason && (
                <div className="mt-3 text-xs text-gc-red bg-gc-red-soft rounded-lg p-3">
                  <span className="font-semibold">Rejected: </span>
                  {row.documents_rejected_reason}
                </div>
              )}
              {row.document_status === "needs_info" && row.documents_info_request && (
                <div className="mt-3 text-xs text-gc-blue-deep bg-gc-sky rounded-lg p-3">
                  <span className="font-semibold">Info requested: </span>
                  {row.documents_info_request}
                </div>
              )}

              {row.files.filter((f) => f.doc_kind !== "earning_proof").length === 0 ? (
                <div className="mt-4 text-xs text-muted-foreground italic">No files uploaded.</div>
              ) : (
                <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {row.files
                    .filter((f) => f.doc_kind !== "earning_proof")
                    .map((f) => (
                      <div key={f.id} className="space-y-1">
                        <FilePreview file={f} />
                        <div className="text-[10px] font-semibold uppercase tracking-wide text-foreground">
                          {f.doc_kind === "identity"
                            ? "ID verification"
                            : f.doc_kind === "driving_license"
                              ? "Driving license"
                              : "Document"}
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground truncate">
                          <FileTypeIcon mime={f.mime_type} />
                          <span className="truncate" title={f.original_name || undefined}>
                            {f.original_name || f.storage_path.split("/").pop()}
                          </span>
                        </div>
                      </div>
                    ))}
                </div>
              )}

              {rejectFor === row.application_id ? (
                <div className="mt-4 rounded-xl border border-gc-red/30 bg-gc-red-soft p-3">
                  <div className="text-xs font-semibold text-gc-red mb-2">Rejection reason (shown to user)</div>
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="e.g. Screenshot is blurry — please re-upload a clearer version."
                    className="w-full rounded-lg border border-gc-red/30 bg-background p-2 text-sm outline-none min-h-[70px]"
                  />
                  <div className="text-[11px] text-gc-red mt-1">
                    User will have 24 hours to re-upload after rejection.
                  </div>
                  <div className="mt-2 flex gap-2">
                    <button
                      onClick={() =>
                        mut.mutate({ id: row.application_id, status: "rejected", reason: reason.trim() })
                      }
                      disabled={mut.isPending || !reason.trim()}
                      className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-gc-red text-gc-on-blue hover:bg-gc-red/90 disabled:opacity-50"
                    >
                      Confirm reject
                    </button>
                    <button
                      onClick={() => {
                        setRejectFor(null);
                        setReason("");
                      }}
                      className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-background border border-border text-foreground"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : infoFor === row.application_id ? (
                <div className="mt-4 rounded-xl border border-gc-blue-soft bg-gc-sky p-3">
                  <div className="text-xs font-semibold text-gc-blue-deep mb-2">
                    What info do you need from the user? (shown to them)
                  </div>
                  <textarea
                    value={infoMsg}
                    onChange={(e) => setInfoMsg(e.target.value)}
                    placeholder="e.g. Please share a screen recording that also shows the account name on your broker terminal."
                    className="w-full rounded-lg border border-gc-blue-soft bg-background p-2 text-sm outline-none min-h-[70px]"
                  />
                  <div className="text-[11px] text-gc-blue-deep mt-1">
                    User can respond and re-upload right away — status resets to Received on their next upload.
                  </div>
                  <div className="mt-2 flex gap-2">
                    <button
                      onClick={() =>
                        mut.mutate({ id: row.application_id, status: "needs_info", info: infoMsg.trim() })
                      }
                      disabled={mut.isPending || !infoMsg.trim()}
                      className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-gc-blue text-gc-on-blue hover:bg-gc-blue-hover disabled:opacity-50"
                    >
                      Send request
                    </button>
                    <button
                      onClick={() => {
                        setInfoFor(null);
                        setInfoMsg("");
                      }}
                      className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-background border border-border text-foreground"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    onClick={() => mut.mutate({ id: row.application_id, status: "verified" })}
                    disabled={mut.isPending || row.document_status === "verified"}
                    className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-gc-success text-gc-on-blue hover:bg-gc-success/90 disabled:opacity-50 inline-flex items-center gap-1"
                  >
                    <Check className="h-3.5 w-3.5" /> Approve
                  </button>
                  <button
                    onClick={() => mut.mutate({ id: row.application_id, status: "pending" })}
                    disabled={mut.isPending || row.document_status === "pending"}
                    className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-gc-amber text-gc-on-blue hover:bg-gc-amber/90 disabled:opacity-50 inline-flex items-center gap-1"
                  >
                    <Clock className="h-3.5 w-3.5" /> Mark reviewing
                  </button>
                  <button
                    onClick={() => {
                      setInfoFor(row.application_id);
                      setInfoMsg(row.documents_info_request || "");
                    }}
                    disabled={mut.isPending}
                    className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-background border border-gc-blue-soft text-gc-blue-deep hover:bg-gc-sky inline-flex items-center gap-1"
                  >
                    <HelpCircle className="h-3.5 w-3.5" /> Need info
                  </button>
                  <button
                    onClick={() => setRejectFor(row.application_id)}
                    disabled={mut.isPending}
                    className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-background border border-gc-red/30 text-gc-red hover:bg-gc-red-soft inline-flex items-center gap-1"
                  >
                    <X className="h-3.5 w-3.5" /> Reject
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      </div>
    </OpsPage>
  );
}
