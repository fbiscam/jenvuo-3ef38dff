import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Lock } from "lucide-react";
import { getTerminalAccess } from "@/lib/terminal-access.functions";

export type TerminalAccessState = { loading: boolean; allowed: boolean };

/** Terminal is unlocked only for approved Founding Program members (and admins). */
export function useTerminalAccess(userId: string | null | undefined): TerminalAccessState {
  const fetchAccess = useServerFn(getTerminalAccess);
  const [state, setState] = useState<TerminalAccessState>({ loading: true, allowed: false });
  useEffect(() => {
    if (!userId) {
      setState({ loading: true, allowed: false });
      return;
    }
    let cancelled = false;
    setState((s) => ({ ...s, loading: true }));
    fetchAccess()
      .then((r) => !cancelled && setState({ loading: false, allowed: Boolean(r?.allowed) }))
      .catch(() => !cancelled && setState({ loading: false, allowed: false }));
    return () => {
      cancelled = true;
    };
  }, [userId, fetchAccess]);
  return state;
}

export function TerminalLocked() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-white px-4 py-16">
      <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-8 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100">
          <Lock className="h-5 w-5 text-zinc-700" />
        </div>
        <h1 className="mt-4 text-xl font-semibold text-zinc-900">Terminal is locked</h1>
        <p className="mt-2 text-sm text-zinc-600">
          The Terminal is only available to approved Founding Program members. Apply to the program — once your
          application is approved, the Terminal unlocks automatically.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          <Link
            to="/founding"
            className="inline-flex items-center gap-2 rounded-xl bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800"
          >
            Apply to the Founding Program
          </Link>
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-800 hover:bg-zinc-50"
          >
            Back to dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}

export function TerminalChecking() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-white text-sm text-zinc-500">
      Checking access…
    </div>
  );
}
