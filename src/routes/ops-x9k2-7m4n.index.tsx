import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { opsStatus, opsUnlock } from "@/lib/ops-gate.functions";

export const Route = createFileRoute("/ops-x9k2-7m4n/")({
  head: () => ({
    meta: [
      { title: "Ops Console" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: OpsLogin,
});

const SANS = "font-['Google_Sans','Product_Sans','Poppins',system-ui,sans-serif]";

function OpsLogin() {
  const router = useRouter();
  const unlock = useServerFn(opsUnlock);
  const status = useServerFn(opsStatus);
  const [id, setId] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let alive = true;
    const token = window.sessionStorage.getItem("jenvu_ops_token") ?? undefined;
    status({ data: { token } })
      .then((s) => {
        if (alive && s.unlocked) router.navigate({ to: "/ops-x9k2-7m4n/hub", replace: true });
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [router, status]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      const res = await unlock({ data: { id: id.trim(), password } });
      if (res.ok) {
        window.sessionStorage.setItem("jenvu_ops_token", res.token);
        await router.navigate({ to: "/ops-x9k2-7m4n/hub" });
      } else {
        setErr("Invalid credentials");
      }
    } catch {
      setErr("Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={`min-h-dvh w-full bg-muted/40 text-gc-ink ${SANS} antialiased`}>
      <main className="mx-auto flex min-h-dvh max-w-md items-center justify-center px-5 py-16 sm:px-6">
        <form onSubmit={onSubmit} className="w-full rounded-2xl border border-border bg-background p-7 shadow-sm sm:p-10">
          <div className="flex items-center gap-2.5">
            <img src="/favicon.png" alt="Jenvu" className="h-7 w-7 rounded-md object-contain" />
            <span className="text-[22px] font-medium leading-none tracking-tight text-gc-ink">Jenvu</span>
            <span className="ml-auto rounded-full bg-gc-sky px-2.5 py-0.5 text-[12px] font-medium text-gc-blue-deep">Ops console</span>
          </div>
          <h1 className="mt-8 text-[28px] font-normal leading-tight text-gc-ink">Sign in to continue</h1>
          <p className="mt-2 text-[14px] text-gc-ink-muted">Internal tools for the Jenvu operations team.</p>
          <div className="mt-7 space-y-5">
            <div>
              <label htmlFor="ops-id" className="text-[13px] font-medium text-gc-ink">ID</label>
              <input id="ops-id" value={id} onChange={(e) => setId(e.target.value)} autoComplete="username" spellCheck={false} className={`mt-1.5 ${inputCls}`} placeholder="Operator ID" />
            </div>
            <div>
              <label htmlFor="ops-pw" className="text-[13px] font-medium text-gc-ink">Password</label>
              <input id="ops-pw" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" className={`mt-1.5 ${inputCls}`} placeholder="••••••••" />
            </div>
            {err && <div className="rounded-xl bg-gc-red-soft px-4 py-3 text-[13px] text-gc-red">{err}</div>}
            <button type="submit" disabled={loading} className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-gc-blue px-5 text-[14px] font-medium text-gc-on-blue transition hover:bg-gc-blue-hover disabled:cursor-not-allowed disabled:opacity-60">
              {loading ? "Verifying…" : "Enter console"}
            </button>
          </div>
          <p className="mt-7 text-center text-[12px] text-gc-ink-muted">Authorized personnel only · all access is logged</p>
        </form>
      </main>
    </div>
  );
}

const inputCls = "h-11 w-full rounded-xl border border-gc-line bg-background px-3.5 text-[14px] text-gc-ink outline-none transition placeholder:text-gc-ink-muted focus:border-gc-blue focus:ring-2 focus:ring-gc-blue-soft";
