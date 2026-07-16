import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { UploadCloud, Trash2, FileVideo, FileImage, FileText } from "lucide-react";
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
  head: () => ({ meta: [{ title: "Earning proof — Jenvu" }] }),
  component: DocumentsPage,
});

const STEPS: { key: string; label: string; desc: string }[] = [
  { key: "not_submitted", label: "Upload", desc: "Add screenshots or a screen-recording of your recent trading earnings." },
  { key: "received", label: "Received", desc: "Your files are uploaded and queued for review." },
  { key: "pending", label: "Under review", desc: "Our team is reviewing your earning proof." },
  { key: "verified", label: "Verified", desc: "Approved — billing is now active on your account." },
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
  if (mime.startsWith("image/")) return <FileImage className="h-4 w-4 text-blue-600" />;
  if (mime.startsWith("video/")) return <FileVideo className="h-4 w-4 text-purple-600" />;
  return <FileText className="h-4 w-4 text-zinc-500" />;
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
  const currentIdx = rejected ? 0 : statusIndex(row?.document_status);
  const canUpload =
    !!row && row.document_status !== "verified" && row.document_status !== "pending";

  const removeMut = useMutation({
    mutationFn: (id: string) => remove({ data: { id } } as any),
    onSuccess: () => {
      toast.success("File removed");
      qc.invalidateQueries({ queryKey: ["my-document-files"] });
      qc.invalidateQueries({ queryKey: ["my-document-status"] });
    },
    onError: (e: any) => toast.error(e?.message || "Could not remove"),
  });

  async function handleFiles(list: FileList | null) {
    if (!list || !list.length || !row) return;
    setUploading(true);
    try {
      const { data: session } = await supabase.auth.getUser();
      const uid = session?.user?.id;
      if (!uid) throw new Error("Not signed in");
      let done = 0;
      for (const file of Array.from(list)) {
        if (file.size > MAX_BYTES) {
          toast.error(`${file.name} exceeds 100 MB`);
          continue;
        }
        setProgress(`Uploading ${++done}/${list.length}: ${file.name}`);
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
          },
        } as any);
      }
      toast.success("Upload complete");
      qc.invalidateQueries({ queryKey: ["my-document-files"] });
      qc.invalidateQueries({ queryKey: ["my-document-status"] });
    } catch (e: any) {
      toast.error(e?.message || "Upload failed");
    } finally {
      setUploading(false);
      setProgress("");
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 font-['Google_Sans',_'Inter',_system-ui,_sans-serif]">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-zinc-900 mt-1">Earning proof</h1>
        <p className="text-sm text-zinc-600 mt-2">
          Upload screenshots or a short screen-recording of your recent trading earnings — billing activates only after our team verifies your proof.
        </p>
      </div>

      {isLoading ? (
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 text-sm text-zinc-500">Loading…</div>
      ) : !row ? (
        <div className="rounded-2xl border border-zinc-200 bg-white p-6">
          <div className="text-sm text-zinc-700">
            We couldn't find a Founding application linked to your account email. Please apply first.
          </div>
          <a
            href="/founding"
            className="inline-block mt-4 rounded-xl bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800"
          >
            Apply now
          </a>
        </div>
      ) : (
        <>
          {/* Stepper */}
          <div className="rounded-2xl border border-zinc-200 bg-white p-6">
            <ol className="space-y-4">
              {STEPS.map((step, i) => {
                const done = i < currentIdx || (i === currentIdx && row?.document_status === "verified");
                const active = i === currentIdx && !rejected && row?.document_status !== "verified";
                return (
                  <li key={step.key} className="flex items-start gap-3">
                    <div
                      className={[
                        "mt-0.5 h-7 w-7 shrink-0 rounded-full flex items-center justify-center text-xs font-semibold",
                        done
                          ? "bg-emerald-500 text-white"
                          : active
                          ? "bg-zinc-900 text-white"
                          : "bg-zinc-100 text-zinc-500",
                      ].join(" ")}
                    >
                      {done ? "✓" : i + 1}
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-semibold text-zinc-900">{step.label}</div>
                      <div className="text-xs text-zinc-600">{step.desc}</div>
                      {active && step.key === "received" && row.documents_submitted_at && (
                        <div className="text-[11px] text-zinc-500 mt-1">
                          Submitted {new Date(row.documents_submitted_at).toLocaleString()}
                        </div>
                      )}
                      {step.key === "verified" && row.documents_verified_at && (
                        <div className="text-[11px] text-emerald-700 mt-1">
                          Verified {new Date(row.documents_verified_at).toLocaleString()}
                        </div>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>

          {rejected && (
            <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-5">
              <div className="text-sm font-semibold text-red-800">Earning proof rejected</div>
              <div className="text-sm text-red-700 mt-1">
                {row.documents_rejected_reason || "Please re-upload clearer or more recent proof."}
              </div>
              {row.documents_rejected_at && (
                <div className="text-[11px] text-red-600 mt-2">
                  {new Date(row.documents_rejected_at).toLocaleString()}
                </div>
              )}
            </div>
          )}

          {/* Uploader */}
          {canUpload && (
            <div className="mt-6 rounded-2xl border border-zinc-200 bg-white p-6">
              <div className="text-sm font-semibold text-zinc-900">Upload earning proof</div>
              <p className="text-xs text-zinc-600 mt-1">
                Images (JPG, PNG), videos (MP4, MOV) or PDFs — up to 100 MB each.
              </p>
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  handleFiles(e.dataTransfer.files);
                }}
                className="mt-3 rounded-xl border-2 border-dashed border-zinc-300 bg-zinc-50 p-6 text-center"
              >
                <UploadCloud className="mx-auto h-8 w-8 text-zinc-400" />
                <div className="mt-2 text-sm text-zinc-700">
                  Drag & drop files here, or{" "}
                  <button
                    type="button"
                    onClick={() => inputRef.current?.click()}
                    className="text-blue-600 font-semibold hover:underline"
                    disabled={uploading}
                  >
                    browse
                  </button>
                </div>
                {uploading && <div className="mt-2 text-xs text-zinc-500">{progress || "Uploading…"}</div>}
                <input
                  ref={inputRef}
                  type="file"
                  multiple
                  accept={ACCEPT}
                  onChange={(e) => handleFiles(e.target.files)}
                  className="hidden"
                />
              </div>
            </div>
          )}

          {/* Uploaded files list */}
          {files.length > 0 && (
            <div className="mt-6 rounded-2xl border border-zinc-200 bg-white p-6">
              <div className="text-sm font-semibold text-zinc-900 mb-3">
                Uploaded files ({files.length})
              </div>
              <ul className="divide-y divide-zinc-100">
                {files.map((f) => (
                  <li key={f.id} className="flex items-center gap-3 py-3">
                    <FileIcon mime={f.mime_type} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-zinc-900 truncate">
                        {f.original_name || f.storage_path.split("/").pop()}
                      </div>
                      <div className="text-[11px] text-zinc-500">
                        {fmtSize(f.file_size)} · {new Date(f.created_at).toLocaleString()}
                      </div>
                    </div>
                    {f.signed_url && (
                      <a
                        href={f.signed_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-blue-600 hover:underline"
                      >
                        View
                      </a>
                    )}
                    {canUpload && (
                      <button
                        onClick={() => removeMut.mutate(f.id)}
                        disabled={removeMut.isPending}
                        className="text-zinc-400 hover:text-red-600"
                        aria-label="Remove"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
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
