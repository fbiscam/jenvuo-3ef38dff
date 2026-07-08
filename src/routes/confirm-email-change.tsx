import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { confirmEmailChange } from "@/lib/email-change.functions";

const searchSchema = z.object({
  token: z.string().optional(),
});

export const Route = createFileRoute("/confirm-email-change")({
  validateSearch: (search) => searchSchema.parse(search),
  component: ConfirmEmailChangePage,
  head: () => ({
    meta: [
      { title: "Confirm email change · Jenvu" },
      { name: "description", content: "Confirm your Jenvu email change." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
});

type Status = "loading" | "success" | "error";

function ConfirmEmailChangePage() {
  const { token } = Route.useSearch();
  const navigate = useNavigate();
  const [status, setStatus] = useState<Status>("loading");
  const [message, setMessage] = useState("Verifying your email change…");
  const [newEmail, setNewEmail] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(5);
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    (async () => {
      if (!token) {
        setStatus("error");
        setMessage("Missing confirmation token.");
        return;
      }
      try {
        const res = await confirmEmailChange({ data: { token } });
        if (!res.ok) {
          setStatus("error");
          setMessage(res.error || "Could not confirm email change.");
          return;
        }
        setNewEmail(res.newEmail);
        setStatus("success");
        setMessage("Your email has been updated. Signing you out…");
        // Sign the user out so they can sign in with the new email.
        await supabase.auth.signOut();
      } catch (e: any) {
        setStatus("error");
        setMessage(e?.message || "Could not confirm email change.");
      }
    })();
  }, [token]);

  useEffect(() => {
    if (status !== "success") return;
    if (countdown <= 0) {
      navigate({ to: "/auth" });
      return;
    }
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [status, countdown, navigate]);

  return (
    <div className="mx-auto flex min-h-screen max-w-md items-center px-6">
      <div className="w-full rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
          Email change
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-zinc-900">
          {status === "loading" && "Verifying…"}
          {status === "success" && "Email updated"}
          {status === "error" && "Confirmation failed"}
        </h1>

        <div className="mt-6 space-y-4">
          {status === "loading" && (
            <div className="flex items-center gap-3 text-sm text-zinc-600">
              <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-900" />
              <span>{message}</span>
            </div>
          )}

          {status === "success" && (
            <>
              <p className="text-sm text-zinc-600">
                Your account email is now <span className="font-medium text-zinc-900">{newEmail}</span>.
              </p>
              <p className="text-sm text-zinc-600">
                Redirecting to sign in in <span className="font-semibold">{countdown}</span>…
              </p>
              <button
                onClick={() => navigate({ to: "/auth" })}
                className="rounded-lg bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-zinc-800"
              >
                Go to sign in
              </button>
            </>
          )}

          {status === "error" && (
            <>
              <p className="text-sm text-rose-600">{message}</p>
              <button
                onClick={() => navigate({ to: "/auth" })}
                className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium hover:bg-zinc-50"
              >
                Back to sign in
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
