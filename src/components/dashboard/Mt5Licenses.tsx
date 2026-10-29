import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Check, Copy, KeyRound, Lock, Trash2 } from "lucide-react";
import { createMt5License, getMt5Access, revokeMt5License, type Mt5LicenseRow } from "@/lib/mt5-licenses.functions";
import { MT5_PLANS, dailyTarget, isMt5Plan } from "@/lib/mt5-licenses";

export type Mt5Access = { plan: string; allowed: boolean; limit: number; expiresAt: string | null; dailyTarget?: number; monthlyTarget?: number; licenses: Mt5LicenseRow[] };

export function useMt5Access() {
  const load = useServerFn(getMt5Access);
  const [access, setAccess] = useState<Mt5Access | null>(null);
  const refresh = async () => {
    try {
      setAccess(await load());
    } catch {
      setAccess({ plan: "free", allowed: false, limit: 0, expiresAt: null, licenses: [] });
    }
  };
  useEffect(() => {
    void refresh(); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return { access, refresh };
}

export function PlanLock({ title }: { title: string }) {
  return (
    <div className="flex flex-col items-center rounded-lg border border-gc-line bg-card px-6 py-10 text-center">
      <Lock className="h-6 w-6 text-gc-ink-muted" />
      <h3 className="mt-3 text-[16px] font-medium text-gc-ink">{title} is locked</h3>
      <p className="mt-1 max-w-md text-[13px] text-gc-ink-muted">Available only with a paid Pro, Elite or Ultra monthly plan. Credit or a free trial does not unlock it.</p>
      <Link to="/dashboard/billing" className="mt-4 rounded-full bg-gc-blue px-4 py-2 text-[13px] font-medium text-gc-on-blue hover:opacity-90">Buy now</Link>
    </div>
  );
}

/** MT5 license manager: one key per IP address, limit enforced by the server. */
export function Mt5Licenses() {
  const { access, refresh } = useMt5Access();
  const create = useServerFn(createMt5License);
  const revoke = useServerFn(revokeMt5License);
  const [account, setAccount] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  if (!access) return <div className="h-32 animate-pulse rounded-lg bg-gc-console-search" />;
  if (!access.allowed) return <PlanLock title="MT5 licenses" />;

  const active = access.licenses.filter((l) => !l.revoked_at);
  const bound = active.filter((l) => l.mt5_account).length;
  const plan = isMt5Plan(access.plan) ? access.plan : "pro";

  const onCreate = async () => {
    setBusy(true);
    try {
      const r = await create({ data: { ip: account.trim() } });
      if (r.ok) {
        toast.success("License created");
        setAccount("");
        await refresh();
      } else toast.error(r.error);
    } catch {
      toast.error("Enter a valid IP address, e.g. 203.0.113.25");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-lg border border-gc-line bg-card p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-[16px] font-medium text-gc-ink">MT5 licenses</h3>
          <p className="text-[12px] text-gc-ink-muted">
            {MT5_PLANS[plan].name} plan · {bound}/{access.limit} used · daily target ${(access.dailyTarget || dailyTarget(plan)).toLocaleString()} · monthly ${(access.monthlyTarget || MT5_PLANS[plan].monthlyTarget).toLocaleString()}
          </p>
        </div>
      </div>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <input
                    value={account}
          onChange={(e) => setAccount(e.target.value.replace(/[^0-9a-fA-F.:]/g, ""))}
          placeholder="IP address of your PC / RDP, e.g. 203.0.113.25"
          className="h-10 flex-1 rounded-lg border border-gc-line bg-card px-3 text-[13px] text-gc-ink outline-none focus:border-gc-blue"
        />
        <button
          type="button"
          onClick={onCreate}
          disabled={busy || account.length < 7 || bound >= access.limit}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-gc-blue px-4 text-[13px] font-medium text-gc-on-blue disabled:opacity-45"
        >
          <KeyRound className="h-4 w-4" /> {busy ? "Creating…" : "Create license"}
        </button>
      </div>
      <p className="mt-1.5 text-[11px] text-gc-ink-muted">Enter the public IP of the PC or RDP that runs MT5 (open whatismyip.com there). Any MT5 account works on that IP.</p>
      <ul className="mt-4 divide-y divide-gc-line">
        {access.licenses.length === 0 && <li className="py-4 text-center text-[12px] text-gc-ink-muted">No licenses yet.</li>}
        {access.licenses.map((l) => (
          <li key={l.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
            <div className="min-w-0">
              <p className="break-all font-mono text-[13px] text-gc-ink">{parseBinding(l.mt5_account).ip ?? "No IP yet"}</p>
              <p className="text-[11px] text-gc-ink-muted">
                {l.revoked_at ? "Revoked" : parseBinding(l.mt5_account).ip ? `IP ${parseBinding(l.mt5_account).ip}${parseBinding(l.mt5_account).account ? ` · MT5 ${parseBinding(l.mt5_account).account}` : ""}` : "No IP yet"}
                {l.last_validated_at ? ` · last check ${new Date(l.last_validated_at).toLocaleString()}` : ""}
              </p>
            </div>
            {!l.revoked_at && (
              <span className="flex gap-1">
                <button type="button" aria-label="Copy key" onClick={() => { void navigator.clipboard.writeText(l.license_key); setCopied(l.id); setTimeout(() => setCopied(null), 1500); }} className="rounded-md p-1.5 text-gc-ink-muted hover:bg-gc-console-search hover:text-gc-ink">
                  {copied === l.id ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </button>
                <button type="button" aria-label="Revoke license" onClick={async () => { await revoke({ data: { id: l.id } }); await refresh(); }} className="rounded-md p-1.5 text-gc-ink-muted hover:bg-gc-console-search hover:text-gc-red">
                  <Trash2 className="h-4 w-4" />
                </button>
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
