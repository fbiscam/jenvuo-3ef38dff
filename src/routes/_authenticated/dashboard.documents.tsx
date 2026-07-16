import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { getMyDocumentStatus, markMyDocumentsSubmitted, type DocumentStatusRow } from "@/lib/founding.functions";

export const Route = createFileRoute("/_authenticated/dashboard/documents")({
  head: () => ({ meta: [{ title: "Document verification — Jenvu" }] }),
  component: DocumentsPage,
});

const STEPS: {
  key: DocumentStatusRow["document_status"];
  label: string;
  desc: string;
}[] = [
  { key: "not_submitted", label: "Submit", desc: "Upload or email your KYC documents." },
  { key: "received", label: "Received", desc: "We have your documents on file." },
  { key: "pending", label: "Under review", desc: "Our team is verifying your details." },
  { key: "verified", label: "Verified", desc: "Billing is now active on your account." },
];

function statusIndex(s: string | undefined) {
  const order = ["not_submitted", "received", "pending", "verified"];
  return Math.max(0, order.indexOf(s || "not_submitted"));
}

function DocumentsPage() {
  const qc = useQueryClient();
  const fetchStatus = useServerFn(getMyDocumentStatus);
  const submit = useServerFn(markMyDocumentsSubmitted);
  const [note, setNote] = useState("");

  const { data, isLoading } = useQuery<DocumentStatusRow | null>({
    queryKey: ["my-document-status"],
    queryFn: () => fetchStatus({ data: undefined as any } as any),
  });

  const mutation = useMutation({
    mutationFn: () => submit({ data: { note: note.trim() || undefined } } as any),
    onSuccess: () => {
      toast.success("Documents marked as submitted. We'll verify shortly.");
      setNote("");
      qc.invalidateQueries({ queryKey: ["my-document-status"] });
    },
    onError: (e: any) => toast.error(e?.message || "Could not submit"),
  });

  const row = data ?? null;
  const rejected = row?.document_status === "rejected";
  const currentIdx = rejected ? 0 : statusIndex(row?.document_status);
  const canSubmit = !row || row.document_status === "not_submitted" || row.document_status === "rejected";

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 font-['Google_Sans',_'Inter',_system-ui,_sans-serif]">
      <div className="mb-6">
        <div className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">Founding Trader</div>
        <h1 className="text-2xl font-semibold text-zinc-900 mt-1">Document verification</h1>
        <p className="text-sm text-zinc-600 mt-2 whitespace-nowrap overflow-hidden text-ellipsis">Track your KYC document status — billing activates only after verification.</p>
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
                const done = i < currentIdx;
                const active = i === currentIdx && !rejected;
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
              <div className="text-sm font-semibold text-red-800">Documents rejected</div>
              <div className="text-sm text-red-700 mt-1">
                {row.documents_rejected_reason || "Please re-submit with clearer or updated documents."}
              </div>
              {row.documents_rejected_at && (
                <div className="text-[11px] text-red-600 mt-2">
                  {new Date(row.documents_rejected_at).toLocaleString()}
                </div>
              )}
            </div>
          )}

          {row.document_status === "verified" ? (
            <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-800">
              You're verified. Billing is live and scans will draw from your wallet as usual.
            </div>
          ) : (
            canSubmit && (
              <div className="mt-6 rounded-2xl border border-zinc-200 bg-white p-6">
                <div className="text-sm font-semibold text-zinc-900">Submit your documents</div>
                <p className="text-xs text-zinc-600 mt-1">
                  Email your government ID and proof of trading to{" "}
                  <a className="underline" href="mailto:support@jenvu.net">support@jenvu.net</a>{" "}
                  from the address on this account, then confirm below.
                </p>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Optional note (e.g. broker statement attached)"
                  className="mt-3 w-full rounded-xl border border-zinc-200 bg-white p-3 text-sm outline-none focus:border-zinc-400 min-h-[80px]"
                />
                <button
                  onClick={() => mutation.mutate()}
                  disabled={mutation.isPending}
                  className="mt-3 rounded-xl bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-50"
                >
                  {mutation.isPending ? "Submitting…" : "I've sent my documents"}
                </button>
              </div>
            )
          )}

          {row.documents_note && row.document_status !== "rejected" && (
            <div className="mt-4 text-xs text-zinc-500">
              Note on file: <span className="text-zinc-700">{row.documents_note}</span>
            </div>
          )}
        </>
      )}
    </div>
  );
}
