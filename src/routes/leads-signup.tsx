import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { btnPrimary, inputCls, labelCls } from "@/components/leadgen/LeadsShell";

export const Route = createFileRoute("/leads-signup")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Create your free Jenvu Leads account — 50 credits" },
      {
        name: "description",
        content:
          "Sign up free for Jenvu Leads and get 50 credits — enough for 100 saved B2B leads from Maps search, people search and website enrichment.",
      },
      { property: "og:title", content: "Create your free Jenvu Leads account — 50 credits" },
      {
        property: "og:description",
        content: "Free B2B lead generation desk. 50 credits on sign-up, no card required.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SignUp,
});

function SignUp() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user) router.navigate({ to: "/leads", replace: true });
    });
  }, [router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (password.length < 8) {
      setErr("Password must be at least 8 characters.");
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/leads`,
        data: { full_name: fullName.trim() || null, signup_source: "leads" },
      },
    });
    setLoading(false);
    if (error) {
      setErr(error.message);
      return;
    }
    // Email confirmation is on by default — no session is returned until the
    // user clicks the link, so never treat sign-up as signed in.
    if (data.session?.user) {
      router.navigate({ to: "/leads", replace: true });
      return;
    }
    setSent(true);
  }

  if (sent) {
    return (
      <div className="lg-console flex min-h-dvh items-center justify-center bg-[#F8F9FA] px-5 py-16 text-[#202124]">
        <div className="w-full max-w-[420px] rounded-lg border border-[#DADCE0] bg-white p-8 text-center">
          <img src="/favicon.png" alt="Jenvu" className="mx-auto h-10 w-10 rounded object-contain" />
          <h1 className="mt-4 text-[22px] font-normal">Confirm your email</h1>
          <p className="mt-2 text-[13px] leading-relaxed text-[#5F6368]">
            We sent a confirmation link to <strong>{email}</strong>. Click it to activate your
            account — your 50 free credits are waiting inside.
          </p>
          <Link
            to="/leads-signin"
            className="mt-6 inline-block rounded border border-[#DADCE0] px-5 py-2 text-[13px] hover:bg-[#F1F3F4]"
          >
            Back to sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="lg-console flex min-h-dvh items-center justify-center bg-[#F8F9FA] px-5 py-16 text-[#202124]">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-[420px] rounded-lg border border-[#DADCE0] bg-white p-8"
      >
        <div className="flex flex-col items-center text-center">
          <img src="/favicon.png" alt="Jenvu" className="h-10 w-10 rounded object-contain" />
          <h1 className="mt-4 text-[24px] font-normal">Create your account</h1>
          <p className="mt-1.5 text-[13px] text-[#5F6368]">
            Free to start — 50 credits included
          </p>
        </div>

        <div className="mt-7 space-y-4">
          <div>
            <label htmlFor="name" className={labelCls}>
              Full name
            </label>
            <input
              id="name"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              autoComplete="name"
              maxLength={100}
              className={inputCls}
            />
          </div>
          <div>
            <label htmlFor="email" className={labelCls}>
              Work email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="username"
              maxLength={255}
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
              autoComplete="new-password"
              minLength={8}
              className={inputCls}
              required
            />
            <p className="mt-1.5 text-[11px] text-[#80868B]">Minimum 8 characters.</p>
          </div>

          {err && (
            <div className="rounded border border-[#F5C6CB] bg-[#FCE8E6] px-3 py-2 text-[12px] text-[#C5221F]">
              {err}
            </div>
          )}

          <button type="submit" disabled={loading} className={`${btnPrimary} w-full`}>
            {loading ? "Creating account…" : "Create free account"}
          </button>
        </div>

        <p className="mt-6 text-center text-[12px] text-[#80868B]">
          Already have an account?{" "}
          <Link to="/leads-signin" className="text-[#1A73E8] hover:underline">
            Sign in
          </Link>
        </p>
      </form>
    </div>
  );
}
