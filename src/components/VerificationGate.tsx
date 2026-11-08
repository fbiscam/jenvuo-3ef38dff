import { Link } from "@tanstack/react-router";
import { ShieldCheck, Lock } from "lucide-react";
import { useVerification } from "@/hooks/useVerification";
import { VerifyNotice } from "@/components/TerminalLockGate";

const FONT = '"Google Sans Flex", "Google Sans", "Google Sans Text", Inter, system-ui, sans-serif';

/** Slim persistent banner shown on the pages an unverified user can still open. */
export function VerificationBanner({ isAdmin = false }: { isAdmin?: boolean }) {
  const { loading, verified, submitted, rejected, needsInfo, status } = useVerification();
  if (isAdmin || loading || verified || !status) return null;

  const tone = rejected ? "error" : submitted || needsInfo ? "warn" : "info";
  const title = rejected ? "Documents rejected" : needsInfo ? "One more document needed" : submitted ? "Documents under review" : "Verify your identity";
  const text = rejected
    ? "Re-upload your ID and driving license to unlock your account."
    : needsInfo
      ? "Our reviewer needs one more document to unlock signals."
      : submitted
        ? "Signals unlock once our team approves them."
        : "Unlock signals and account changes.";

  return <VerifyNotice tone={tone} title={title} text={text} action={submitted ? "View documents" : "Verify identity"} />;
}

/** Full-page lock shown instead of restricted page content. */
export function VerificationLocked() {
  const { submitted, rejected, needsInfo } = useVerification();
  return (
    <div className="mx-auto max-w-xl px-4 py-16" style={{ fontFamily: FONT }}>
      <div className="rounded-2xl border border-zinc-200 bg-white p-8 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100">
          <Lock className="h-5 w-5 text-zinc-700" />
        </div>
        <h1 className="mt-4 text-xl font-semibold text-zinc-900">Verification required</h1>
        <p className="mt-2 text-sm text-zinc-600">
          {rejected
            ? "Your documents were rejected. Re-upload your ID verification and driving license to regain access."
            : needsInfo
              ? "Our reviewer asked for one more document. Add it and this page unlocks automatically."
              : submitted
                ? "Your documents are under review. This page unlocks as soon as our team approves them."
                : "Submit your ID verification and driving license to unlock signals and account changes."}
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          <Link
            to="/dashboard/documents"
            className="inline-flex items-center gap-2 rounded-xl bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800"
          >
            <ShieldCheck className="h-4 w-4" /> Submit documents
          </Link>
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-800 hover:bg-zinc-50"
          >
            Back to dashboard
          </Link>
        </div>
        <p className="mt-4 text-xs text-zinc-500">
          Available while unverified: Dashboard, Profile, Security and Documents.
        </p>
      </div>
    </div>
  );
}
