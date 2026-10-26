import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { UploadCloud, Trash2, FileVideo, FileImage, FileText, Check, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  if (mime.startsWith("image/")) return <FileImage className="h-4 w-4 text-gc-blue" />;
  if (mime.startsWith("video/")) return <FileVideo className="h-4 w-4 text-gc-blue" />;
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

  return (
    <div
      className="mx-auto max-w-5xl space-y-8 py-2 font-sans"
    >
      <div className="border-b border-border pb-6">
        <h1 className="text-2xl font-semibold text-foreground">Identity verification</h1>
        <p className={`max-w-2xl text-sm leading-relaxed text-muted-foreground mt-2`}>
          Submit your ID verification and driving license. Signals, alerts and account changes unlock as soon as our team approves your documents.
        </p>
      </div>

      {isLoading ? (
        <div className="border-b border-border pb-6 text-sm text-muted-foreground">Loading…</div>
      ) : !row ? (
        <div className="border-b border-border pb-6">
          <div className="text-sm text-foreground">
            We couldn't find a Founding application linked to your account email. Please apply first.
          </div>
          <a
            href="/founding"
            className="inline-block mt-4 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
          >
            Apply now
          </a>
        </div>
      ) : (
        <>
          {/* Stepper */}
          <div className={`border-b border-border pb-6`}>
            <ol className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {STEPS.map((step, i) => {
                const done = i < currentIdx || (i === currentIdx && row?.document_status === "verified");
                const active = i === currentIdx && !rejected && !needsInfo && row?.document_status !== "verified";
                
                return (
                  <li key={step.key} className="flex items-start gap-3">
                    <div className="flex flex-col items-center self-stretch">
                      <div
                        className={[
                          "jenvu-proof-step-circle mt-0.5 h-7 w-7 shrink-0 rounded-full flex items-center justify-center text-xs font-semibold border-2",
                          done
                            ? "border-gc-success bg-gc-success text-gc-on-blue"
                            : active
                            ? "border-gc-blue bg-gc-blue text-gc-on-blue ring-4 ring-gc-blue-soft"
                            : "border-border bg-background text-muted-foreground",
                        ].join(" ")}
                      >
                        {done ? <Check className="h-4 w-4" strokeWidth={3} /> : i + 1}
                      </div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold text-foreground">{step.label}</div>
                      <div className="text-xs text-muted-foreground">{step.desc}</div>
                      {active && step.key === "received" && row.documents_submitted_at && (
                        <div className="text-[11px] text-muted-foreground mt-1">
                          Submitted {new Date(row.documents_submitted_at).toLocaleString()}
                        </div>
                      )}
                      {step.key === "verified" && row.documents_verified_at && (
                        <div className="text-[11px] text-gc-success mt-1">
                          Verified {new Date(row.documents_verified_at).toLocaleString()}
                        </div>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>

          {needsInfo && (
            <div className="mt-4 rounded-lg border border-gc-blue/20 bg-gc-blue-soft p-5">
              <div className="text-sm font-semibold text-foreground">Reviewer needs more info</div>
              <div className="text-sm text-muted-foreground mt-1 whitespace-pre-line">
                {row.documents_info_request || "Our team asked for a small update. Please upload the missing item below."}
              </div>
              {row.documents_info_requested_at && (
                <div className="text-[11px] text-gc-blue mt-2">
                  Requested {new Date(row.documents_info_requested_at).toLocaleString()}
                </div>
              )}
              <div className="text-xs text-muted-foreground mt-3">
                Upload the requested file below — your submission will go straight back to review.
              </div>
            </div>
          )}

          {rejected && (
            <div className="mt-4 rounded-lg border border-destructive/30 bg-background p-5">
              <div className="text-sm font-semibold text-destructive">Documents rejected</div>
              <div className="text-sm text-muted-foreground mt-1">
                {row.documents_rejected_reason || "Please re-upload clearer or more recent ID and driving license."}
              </div>
              {row.documents_rejected_at && (
                <div className="text-[11px] text-foreground mt-2">
                  {new Date(row.documents_rejected_at).toLocaleString()}
                </div>
              )}
              <div className="text-xs mt-3 font-medium text-foreground">
                You can re-submit right away — just upload updated ID and driving license below.
              </div>
            </div>
          )}

          {row.document_status === "verified" && (
            <div className="flex items-start gap-4 rounded-lg border border-gc-success/20 bg-gc-green-soft p-5">
              <ShieldCheck className="h-6 w-6 shrink-0 text-gc-success" />
              <div>
                <h2 className="text-base font-semibold text-foreground">Identity verified</h2>
                <p className="mt-1 text-sm text-muted-foreground">Your documents have been approved.</p>
              </div>
            </div>
          )}

          {/* Uploader */}
          {canUpload && (
            <div className="mt-6 border-b border-border pb-6">
              <div className="text-sm font-semibold text-foreground">Upload documents</div>
              <p className="text-xs text-muted-foreground mt-1">
                Images (JPG, PNG), videos (MP4, MOV) or PDFs — up to 100 MB each.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {DOC_KINDS.map((k) => {
                  const uploaded = files.some((f) => f.doc_kind === k.key);
                  return (
                    <Button
                      key={k.key}
                      type="button"
                      onClick={() => setDocKind(k.key)}
                      className={[
                        "rounded-md border px-3 py-2 text-xs font-medium transition",
                        docKind === k.key
                          ? "border-gc-blue bg-gc-blue-soft text-gc-blue"
                          : "border-border bg-background text-foreground hover:bg-muted",
                      ].join(" ")}
                    >
                      {k.label}
                      {k.required && !uploaded ? " *" : ""}
                      {uploaded ? " ✓" : ""}
                    </Button>
                  );
                })}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {DOC_KINDS.find((k) => k.key === docKind)?.desc}
              </p>
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  handleFiles(e.dataTransfer.files);
                }}
                className="mt-4 rounded-lg border-2 border-dashed border-border bg-muted/40 p-8 text-center transition-colors hover:border-gc-blue"
              >
                <UploadCloud className="mx-auto h-8 w-8 text-muted-foreground" />
                <div className="mt-2 text-sm text-foreground">
                  Drag & drop files here, or{" "}
                  <Button
                    type="button"
                    onClick={() => inputRef.current?.click()}
                    variant="link" className="h-auto p-0 text-gc-blue"
                    disabled={uploading}
                  >
                    browse
                  </Button>
                </div>
                {uploading && <div className="mt-2 text-xs text-muted-foreground">{progress || "Uploading…"}</div>}
                <input
                  ref={inputRef}
                  type="file"
                  multiple
                  accept={ACCEPT}
                  onChange={(e) => handleFiles(e.target.files)}
                  className="hidden"
                />
              </div>

              {pending.length > 0 && (
                <div className="mt-4 rounded-lg border border-border bg-background">
                  <div className="px-4 py-2 text-xs font-semibold text-foreground border-b border-border">
                    Ready to submit ({pending.length})
                  </div>
                  <ul className="divide-y divide-border">
                    {pending.map((f, i) => (
                      <li key={`${f.name}-${i}`} className="flex items-center gap-3 px-4 py-2 text-sm">
                        <FileIcon mime={f.type || ""} />
                        <div className="flex-1 min-w-0">
                          <div className="truncate text-foreground">{f.name}</div>
                          <div className="text-xs text-muted-foreground">{fmtSize(f.size)}</div>
                        </div>
                        <Button
                          type="button"
                          onClick={() => removePending(i)}
                          disabled={uploading}
                          variant="ghost" size="icon-sm" className="text-muted-foreground hover:text-destructive"
                          aria-label="Remove"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="mt-4 flex items-center justify-end gap-3">
                {uploading && <div className="text-xs text-muted-foreground">{progress}</div>}
                <Button
                  type="button"
                  onClick={submitPending}
                  disabled={pending.length === 0 || uploading}
                  className="bg-gc-blue text-gc-on-blue hover:bg-gc-blue-hover"
                >
                  {uploading ? "Submitting…" : `Submit${pending.length ? ` (${pending.length})` : ""}`}
                </Button>
              </div>
            </div>
          )}

          {/* Uploaded files list */}
          {canUpload && files.length > 0 && (
            <div className="mt-6 border-b border-border pb-6">
              <div className="text-sm font-semibold text-foreground mb-3">
                Uploaded files ({files.length})
              </div>
              <ul className="divide-y divide-border">
                {files.map((f) => (
                  <li key={f.id} className="flex items-center gap-3 py-3">
                    <FileIcon mime={f.mime_type} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-foreground truncate">
                        {f.original_name || f.storage_path.split("/").pop()}
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        {fmtSize(f.file_size)} · {new Date(f.created_at).toLocaleString()}
                      </div>
                    </div>
                    {f.signed_url && (
                      <a
                        href={f.signed_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-gc-blue hover:underline"
                      >
                        View
                      </a>
                    )}
                    {canUpload && (
                      <Button
                        onClick={() => removeMut.mutate(f.id)}
                        disabled={removeMut.isPending}
                        variant="ghost" size="icon-sm" className="text-muted-foreground hover:text-destructive"
                        aria-label="Remove"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

        </>
      )}
    </div>
  );
}
