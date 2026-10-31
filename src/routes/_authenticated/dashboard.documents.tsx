import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { UploadCloud, Trash2, FileVideo, FileImage, FileText, Check, ShieldCheck } from "lucide-react";
import { SettingsCard, SettingsFlat, SettingsRow } from "@/components/settings/SettingsCard";
import { supabase } from "@/integrations/supabase/client";
import {
  getMyDocumentStatus,
  listMyDocumentFiles,
  registerDocumentFile,
  deleteMyDocumentFile,
  type DocumentStatusRow,
  type FoundingDocFile,
} from "@/lib/founding.functions";

export const Route = createFileRoute("/_authenticated/dashboard/documents")({
  head: () => ({ meta: [
    { title: "Identity verification — Jenvu" },
    { name: "description", content: "Submit and track your Founding identity documents securely in Jenvu." },
    { property: "og:title", content: "Identity verification — Jenvu" },
    { property: "og:description", content: "Submit and track your Founding identity documents securely in Jenvu." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
    { name: "robots", content: "noindex,nofollow" },
  ] }),
  component: DocumentsPage,
});

const STEPS: { key: string; label: string; desc: string }[] = [
  { key: "not_submitted", label: "Upload", desc: "Add clear photos of your ID and driving license." },
  { key: "received", label: "Received", desc: "Your documents are uploaded and queued for review." },
  { key: "pending", label: "Under review", desc: "Our team is reviewing your identity documents." },
  { key: "verified", label: "Verified", desc: "Approved — full platform access is now unlocked." },
];

type DocKind = "identity" | "driving_license";
const DOC_KINDS: { key: DocKind; label: string; desc: string; required: boolean }[] = [
  { key: "identity", label: "ID verification", desc: "Passport or national ID — clear photo of the front (and back if applicable).", required: true },
  { key: "driving_license", label: "Driving license", desc: "Front side of your driving license, fully readable.", required: true },
];

const pillBtn =
  "inline-flex h-9 items-center justify-center gap-1.5 rounded-full border border-gc-line bg-background px-4 text-[14px] text-gc-ink hover:bg-gc-surface disabled:opacity-50";

const MAX_BYTES = 100 * 1024 * 1024; // 100 MB per file
const ACCEPT = "image/*,video/*,.pdf";

function statusIndex(s: string | undefined) {
  const order = ["not_submitted", "received", "pending", "verified"];
  return Math.max(0, order.indexOf(s || "not_submitted"));
}

function fmtSize(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

function FileIcon({ mime }: { mime: string }) {
  if (mime.startsWith("image/")) return <FileImage className="h-4 w-4 text-gc-ink-muted" />;
  if (mime.startsWith("video/")) return <FileVideo className="h-4 w-4 text-gc-ink-muted" />;
  return <FileText className="h-4 w-4 text-muted-foreground" />;
}

function DocumentsPage() {
  const qc = useQueryClient();
  const fetchStatus = useServerFn(getMyDocumentStatus);
  const fetchFiles = useServerFn(listMyDocumentFiles);
  const register = useServerFn(registerDocumentFile);
  const remove = useServerFn(deleteMyDocumentFile);
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<string>("");
  const [pending, setPending] = useState<File[]>([]);
  const [docKind, setDocKind] = useState<DocKind>("identity");

  const { data: row, isLoading } = useQuery<DocumentStatusRow | null>({
    queryKey: ["my-document-status"],
    queryFn: () => fetchStatus({ data: undefined as any } as any),
  });

  const { data: files = [] } = useQuery<FoundingDocFile[]>({
    queryKey: ["my-document-files"],
    queryFn: () => fetchFiles({ data: undefined as any } as any),
    enabled: !!row,
  });

  const rejected = row?.document_status === "rejected";
  const needsInfo = row?.document_status === "needs_info";
  const currentIdx = rejected || needsInfo ? 0 : statusIndex(row?.document_status);
  const canUpload = !!row && row.document_status !== "verified";

  const removeMut = useMutation({
    mutationFn: (id: string) => remove({ data: { id } } as any),
    onSuccess: () => {
      toast.success("File removed");
      qc.invalidateQueries({ queryKey: ["my-document-files"] });
      qc.invalidateQueries({ queryKey: ["my-document-status"] });
    },
    onError: (e: any) => toast.error(e?.message || "Could not remove"),
  });

  function handleFiles(list: FileList | null) {
    if (!list || !list.length) return;
    const accepted: File[] = [];
    for (const file of Array.from(list)) {
      if (file.size > MAX_BYTES) {
        toast.error(`${file.name} exceeds 100 MB`);
        continue;
      }
      accepted.push(file);
    }
    if (accepted.length) {
      setPending((prev) => [...prev, ...accepted]);
    }
    if (inputRef.current) inputRef.current.value = "";
  }

  function removePending(idx: number) {
    setPending((prev) => prev.filter((_, i) => i !== idx));
  }

  async function submitPending() {
    if (!pending.length || !row) return;
    setUploading(true);
    try {
      const { data: session } = await supabase.auth.getUser();
      const uid = session?.user?.id;
      if (!uid) throw new Error("Not signed in");
      let done = 0;
      for (const file of pending) {
        setProgress(`Uploading ${++done}/${pending.length}: ${file.name}`);
        const safe = file.name.replace(/[^\w.\-]+/g, "_").slice(-80);
        const path = `${uid}/${row.id}/${Date.now()}-${safe}`;
        const { error: upErr } = await supabase.storage
          .from("founding-docs")
          .upload(path, file, { contentType: file.type || "application/octet-stream", upsert: false });
        if (upErr) {
          toast.error(`${file.name}: ${upErr.message}`);
          continue;
        }
        await register({
          data: {
            storage_path: path,
            mime_type: file.type || "application/octet-stream",
            file_size: file.size,
            original_name: file.name,
            doc_kind: docKind,
          },
        } as any);
      }
      toast.success("Submitted for review");
      setPending([]);
      qc.invalidateQueries({ queryKey: ["my-document-files"] });
      qc.invalidateQueries({ queryKey: ["my-document-status"] });
    } catch (e: any) {
      toast.error(e?.message || "Upload failed");
    } finally {
      setUploading(false);
      setProgress("");
    }
  }


  const statusBadge = (done: boolean, active: boolean) =>
    done ? (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-gc-green-soft px-3 py-1 text-[12px] font-medium text-gc-success">
        <Check className="h-3.5 w-3.5" strokeWidth={2.5} /> Done
      </span>
    ) : active ? (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-gc-line px-3 py-1 text-[12px] font-medium text-gc-ink">
        <span className="h-1.5 w-1.5 rounded-full bg-orange-500" aria-hidden="true" /> In progress
      </span>
    ) : (
      <span className="text-[13px] text-gc-ink-muted">Waiting</span>
    );

  return (
    <SettingsFlat>
      <div className="mx-auto w-full max-w-[930px] pb-10 pt-2 text-foreground">
        <h1 className="px-1 text-[28px] font-normal leading-tight tracking-tight text-gc-ink sm:px-2 sm:text-[32px]">Documents</h1>
        <p className="mt-2 max-w-2xl px-1 text-[14px] leading-relaxed text-gc-ink-muted sm:px-2">
          Submit your ID and driving license. Signals, alerts and account changes unlock as soon as our team approves them.
        </p>

        <div className="mt-8 space-y-10">
          {isLoading ? (
            <p className="px-2 text-[14px] text-gc-ink-muted">Loading…</p>
          ) : !row ? (
            <SettingsCard id="apply" title="No application found">
              <SettingsRow label="We couldn't find a Founding application linked to your account email.">
                <a href="/founding" className={pillBtn}>Apply now</a>
              </SettingsRow>
            </SettingsCard>
          ) : (
            <>
              <SettingsCard
                id="status"
                title="Verification status"
                action={row.document_status === "verified" ? (
                  <span className="inline-flex items-center gap-1.5 text-[14px] font-medium text-gc-success">
                    <ShieldCheck className="h-4 w-4" /> Verified
                  </span>
                ) : undefined}
              >
                {STEPS.map((step, i) => {
                  const done = i < currentIdx || (i === currentIdx && row.document_status === "verified");
                  const active = i === currentIdx && !rejected && !needsInfo && row.document_status !== "verified";
                  const when =
                    step.key === "received" && row.documents_submitted_at
                      ? `Submitted ${new Date(row.documents_submitted_at).toLocaleString()}`
                      : step.key === "verified" && row.documents_verified_at
                        ? `Verified ${new Date(row.documents_verified_at).toLocaleString()}`
                        : null;
                  return (
                    <SettingsRow
                      key={step.key}
                      label={<span className="text-gc-ink">{i + 1}. {step.label}</span>}
                      hint={<>{step.desc}{when && <span className="block text-[12px]">{when}</span>}</>}
                    >
                      {statusBadge(done, active)}
                    </SettingsRow>
                  );
                })}
              </SettingsCard>

              {needsInfo && (
                <div className="rounded-xl border border-gc-line bg-gc-surface p-5">
                  <p className="text-[15px] font-medium text-gc-ink">Reviewer needs more info</p>
                  <p className="mt-1 whitespace-pre-line text-[14px] text-gc-ink-muted">
                    {row.documents_info_request || "Our team asked for a small update. Please upload the missing item below."}
                  </p>
                  {row.documents_info_requested_at && (
                    <p className="mt-2 text-[12px] text-gc-ink-muted">Requested {new Date(row.documents_info_requested_at).toLocaleString()}</p>
                  )}
                </div>
              )}

              {rejected && (
                <div className="rounded-xl border border-destructive/30 p-5">
                  <p className="text-[15px] font-medium text-destructive">Documents rejected</p>
                  <p className="mt-1 text-[14px] text-gc-ink-muted">
                    {row.documents_rejected_reason || "Please re-upload clearer or more recent ID and driving license."}
                  </p>
                  <p className="mt-2 text-[13px] text-gc-ink">You can re-submit right away below.</p>
                </div>
              )}

              {canUpload && (
                <SettingsCard id="upload" title="Upload documents" description="Images (JPG, PNG), videos (MP4, MOV) or PDFs — up to 100 MB each.">
                  <SettingsRow label="Document type" hint={DOC_KINDS.find((k) => k.key === docKind)?.desc}>
                    <div role="radiogroup" aria-label="Document type" className="inline-flex rounded-full border border-gc-line bg-gc-surface p-1">
                      {DOC_KINDS.map((k) => {
                        const uploaded = files.some((f) => f.doc_kind === k.key);
                        return (
                          <button
                            key={k.key}
                            type="button"
                            role="radio"
                            aria-checked={docKind === k.key}
                            onClick={() => setDocKind(k.key)}
                            className={`h-8 rounded-full px-4 text-[13px] font-medium transition-colors ${docKind === k.key ? "bg-background text-gc-ink shadow-sm" : "text-gc-ink-muted hover:text-gc-ink"}`}
                          >
                            {k.label}{uploaded ? " ✓" : ""}
                          </button>
                        );
                      })}
                    </div>
                  </SettingsRow>
                  <div className="px-1 py-5 sm:px-2">
                    <div
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => { e.preventDefault(); handleFiles(e.dataTransfer.files); }}
                      className="rounded-xl border border-dashed border-gc-line bg-gc-surface px-6 py-10 text-center transition-colors hover:border-gc-ink-muted"
                    >
                      <UploadCloud className="mx-auto h-7 w-7 text-gc-ink-muted" />
                      <p className="mt-3 text-[14px] text-gc-ink">Drag & drop files here</p>
                      <button type="button" onClick={() => inputRef.current?.click()} disabled={uploading} className={`mt-4 ${pillBtn}`}>
                        Browse files
                      </button>
                      {uploading && <p className="mt-3 text-[12px] text-gc-ink-muted">{progress || "Uploading…"}</p>}
                      <input ref={inputRef} type="file" multiple accept={ACCEPT} onChange={(e) => handleFiles(e.target.files)} className="hidden" />
                    </div>
                  </div>
                  {pending.map((f, i) => (
                    <SettingsRow key={`${f.name}-${i}`} label={<span className="flex min-w-0 items-center gap-2 text-gc-ink"><FileIcon mime={f.type || ""} /><span className="truncate">{f.name}</span></span>} hint={`Ready to submit · ${fmtSize(f.size)}`}>
                      <button type="button" onClick={() => removePending(i)} disabled={uploading} aria-label="Remove" className="text-gc-ink-muted hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </SettingsRow>
                  ))}
                  <div className="flex justify-end px-1 py-4 sm:px-2">
                    <button
                      type="button"
                      onClick={submitPending}
                      disabled={pending.length === 0 || uploading}
                      className="inline-flex h-9 items-center justify-center rounded-full bg-gc-blue px-5 text-[14px] font-medium text-gc-on-blue hover:bg-gc-blue-hover disabled:opacity-50"
                    >
                      {uploading ? "Submitting…" : `Submit${pending.length ? ` (${pending.length})` : ""}`}
                    </button>
                  </div>
                </SettingsCard>
              )}

              {canUpload && files.length > 0 && (
                <SettingsCard id="files" title={`Uploaded files (${files.length})`}>
                  {files.map((f) => (
                    <SettingsRow
                      key={f.id}
                      label={<span className="flex min-w-0 items-center gap-2 text-gc-ink"><FileIcon mime={f.mime_type} /><span className="truncate">{f.original_name || f.storage_path.split("/").pop()}</span></span>}
                      hint={`${fmtSize(f.file_size)} · ${new Date(f.created_at).toLocaleString()}`}
                    >
                      <span className="inline-flex items-center gap-4">
                        {f.signed_url && (
                          <a href={f.signed_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-gc-ink hover:underline">View</a>
                        )}
                        <button onClick={() => removeMut.mutate(f.id)} disabled={removeMut.isPending} aria-label="Remove" className="text-gc-ink-muted hover:text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </span>
                    </SettingsRow>
                  ))}
                </SettingsCard>
              )}
            </>
          )}
        </div>
      </div>
    </SettingsFlat>
  );
}
