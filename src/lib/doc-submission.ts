/**
 * Identity document submission rules (shared by the Documents page and the server).
 * Members upload once; after Submit the files are locked (no new uploads, no view,
 * no delete) until a reviewer rejects them or asks for more info.
 */

export type DocKindCounts = { identity: number; driving_license: number };

/** Statuses in which the member may upload files. */
export const OPEN_UPLOAD_STATUSES = ["not_submitted", "rejected", "needs_info"] as const;

export function canUploadDocuments(status: string | null | undefined): boolean {
  return (OPEN_UPLOAD_STATUSES as readonly string[]).includes(status || "not_submitted");
}

export const DOCS_LOCKED_MESSAGE =
  "Your documents are already submitted and locked. Our team will tell you here if anything else is needed.";

/**
 * Why a submission can't go through yet, or null when it can.
 * - First submission: needs at least one ID file and one driving-license file.
 * - After a rejection or info request: needs at least one new file.
 */
export function submissionBlock(input: {
  status: string | null | undefined;
  kinds: DocKindCounts;
  newFiles: number;
}): string | null {
  const status = input.status || "not_submitted";
  if (!canUploadDocuments(status)) return DOCS_LOCKED_MESSAGE;
  if (status === "not_submitted") {
    if (input.kinds.identity < 1) return "Add your ID before submitting.";
    if (input.kinds.driving_license < 1) return "Add your driving license before submitting.";
    return null;
  }
  if (input.newFiles < 1) return "Add the updated document before submitting.";
  return null;
}
