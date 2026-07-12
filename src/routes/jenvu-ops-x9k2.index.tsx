import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { Lock, Loader2 } from "lucide-react";
import { adminLogin, adminMe } from "@/lib/admin-gate.functions";

export const Route = createFileRoute("/jenvu-ops-x9k2/")({
  head: () => ({
    meta: [
      { title: "Admin Sign In — Jenvu" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminLogin,
});

function AdminLogin() {
  const navigate = useNavigate();
  const login = useServerFn(adminLogin);
  const me = useServerFn(adminMe);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    me()
      .then((r) => {
        if (r.unlocked) navigate({ to: "/jenvu-ops-x9k2/inbox", replace: true });
      })
      .finally(() => setChecking(false));
  }, [me, navigate]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      const r = await login({ data: { username, password } });
      if (r.ok) {
        navigate({ to: "/jenvu-ops-x9k2/inbox", replace: true });
      } else {
        setError(r.error || "Invalid credentials");
      }
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  }

  if (checking) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#FAFAFA]">
        <Loader2 className="h-5 w-5 animate-spin text-zinc-400" />
      </div>
    );
  }

  return (
    <div className="grid min-h-screen place-items-center bg-gradient-to-br from-white via-zinc-50 to-zinc-100 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white/90 p-6 shadow-xl backdrop-blur">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-white ring-1 ring-zinc-200 shadow-sm overflow-hidden">
            <img src="/favicon.png" alt="Jenvu" className="h-10 w-10 object-contain" />
          </div>
          <h1 className="mt-3 text-lg font-semibold text-zinc-900">Support Access</h1>
          <p className="mt-1 text-xs text-zinc-500">
            Restricted area. Enter your admin credentials to continue.
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-3">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-zinc-700">Admin ID</span>
            <input
              type="text"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10"
              placeholder="admin"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-zinc-700">Password</span>
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10"
              placeholder="••••••••"
            />
          </label>

          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !username || !password}
            className="flex w-full items-center justify-center gap-2 rounded-md bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p className="mt-6 text-center text-[10px] text-zinc-400">
          Session is encrypted &amp; expires in 7 days.
        </p>
      </div>
    </div>
  );
}
