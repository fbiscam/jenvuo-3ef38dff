import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { btnPrimary, inputCls, labelCls } from "@/components/leadgen/LeadsShell";

export const Route = createFileRoute("/leads-signin")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Sign in — Jenvu Leads" },
      { name: "description", content: "Sign in to the invite-only Jenvu Leads generation desk." },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: SignIn,
});

function SignIn() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user) router.navigate({ to: "/leads", replace: true });
    });
  }, [router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    setLoading(false);
    if (error) {
      setErr(error.message);
      return;
    }
    router.navigate({ to: "/leads", replace: true });
  }

  return (
    <div className="lg-console flex min-h-dvh items-center justify-center bg-[#F8F9FA] px-5 py-16 text-[#202124]">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-[420px] rounded-lg border border-[#DADCE0] bg-white p-8"
      >
        <div className="flex flex-col items-center text-center">
          <img src="/favicon.png" alt="Jenvu" className="h-10 w-10 rounded object-contain" />
          <h1 className="mt-4 text-[24px] font-normal">Sign in</h1>
          <p className="mt-1.5 text-[13px] text-[#5F6368]">Continue to Jenvu Leads</p>
        </div>

        <div className="mt-7 space-y-4">
          <div>
            <label htmlFor="email" className={labelCls}>
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="username"
              className={inputCls}
              required
            />
          </div>
          <div>
            <label htmlFor="password" className={labelCls}>
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              className={inputCls}
              required
            />
          </div>

          {err && (
            <div className="rounded border border-[#F5C6CB] bg-[#FCE8E6] px-3 py-2 text-[12px] text-[#C5221F]">
              {err}
            </div>
          )}

          <button type="submit" disabled={loading} className={`${btnPrimary} w-full`}>
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </div>

        <p className="mt-6 text-center text-[12px] text-[#80868B]">
          New here?{" "}
          <Link to="/leads-signup" className="text-[#1A73E8] hover:underline">
            Create a free account
          </Link>{" "}
          and get 50 credits.
        </p>

      </form>
    </div>
  );
}
