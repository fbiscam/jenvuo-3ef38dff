import { useCallback, useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Check, Copy, Gift, RefreshCw, Send } from "lucide-react";
import { isAdmin } from "@/lib/admin-messages.functions";
import { opsCreatePlanGift, opsListPlanGifts, opsResendPlanGift, opsRevokePlanGift, type PlanGiftRow } from "@/lib/plan-gift.functions";
import { GIFT_MONTHS, GIFT_PLANS, GIFT_PLAN_PERKS, monthsLabel, validGiftEmail, type GiftMonths, type GiftPlanId } from "@/lib/plan-gift";
import { OpsBadge, OpsPage, OpsSection, OpsState, OpsStats, OpsTab, ops, type OpsTone } from "@/components/ops/OpsPage";

type Tab = "create" | "codes";

const STATUS_TONE: Record<string, OpsTone> = { active: "info", redeemed: "success", revoked: "neutral" };

function Segmented<T extends string | number>({
  value,
  options,
  onChange,
  label,
  render,
}: {
  value: T;
  options: readonly T[];
  onChange: (v: T) => void;
  label: string;
  render: (v: T) => string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="grid gap-2"
      style={{ gridTemplateColumns: `repeat(${Math.min(options.length, 6)}, minmax(0, 1fr))` }}
    >
      {options.map((o) => {
        const active = o === value;
        return (
          <button
            key={String(o)}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o)}
            className={`h-11 rounded-xl text-[13.5px] font-medium transition ${
              active ? "bg-foreground text-background" : "ops-btn text-foreground"
            }`}
          >
            {render(o)}
          </button>
        );
      })}
    </div>
  );
}

export function AdminPromosPage() {
  const checkAdmin = useServerFn(isAdmin);
  const listFn = useServerFn(opsListPlanGifts);
  const createFn = useServerFn(opsCreatePlanGift);
  const resendFn = useServerFn(opsResendPlanGift);
  const revokeFn = useServerFn(opsRevokePlanGift);

  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const [tab, setTab] = useState<Tab>("create");
  const [rows, setRows] = useState<PlanGiftRow[]>([]);
  const [plan, setPlan] = useState<GiftPlanId>("pro");
  const [months, setMonths] = useState<GiftMonths>(1);
  const [email, setEmail] = useState("");
  const [note, setNote] = useState("");
  const [validDays, setValidDays] = useState("30");
  const [busy, setBusy] = useState<string | null>(null);
  const [last, setLast] = useState<{ code: string; email: string; emailed: boolean } | null>(null);
  const [query, setQuery] = useState("");

  const load = useCallback(async () => {
    try {
      setRows(await listFn());
    } catch (e: any) {
      toast.error(e?.message ?? "Could not load codes.");
    }
  }, [listFn]);

  useEffect(() => {
    (async () => {
      try {
        const a = await checkAdmin();
        setAllowed(a.admin);
        if (a.admin) await load();
      } catch {
        setAllowed(false);
      } finally {
        setLoading(false);
      }
    })();
  }, [checkAdmin, load]);

  const emailOk = validGiftEmail(email);
  const days = Math.max(1, Math.min(365, Number(validDays) || 30));

  async function create(send: boolean) {
    if (!emailOk) return toast.error("Enter a valid email.");
    setBusy(send ? "send" : "create");
    try {
      const r = await createFn({ data: { plan, months, email: email.trim(), note: note.trim() || undefined, validDays: days, send } });
      setLast({ code: r.code, email: email.trim().toLowerCase(), emailed: r.emailed });
      if (send && !r.emailed) toast.error(r.message);
      else toast.success(send ? `Code sent to ${email.trim()}.` : "Code created.");
      setEmail("");
      setNote("");
      await load();
    } catch (e: any) {
      toast.error(e?.message ?? "Could not create the code.");
    } finally {
      setBusy(null);
    }
  }

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Copied.");
    } catch {
      toast.error("Copy failed.");
    }
  }

  async function resend(code: string) {
    setBusy(code);
    try {
      const r = await resendFn({ data: { code } });
      r.emailed ? toast.success(r.message) : toast.error(r.message);
      await load();
    } catch (e: any) {
      toast.error(e?.message ?? "Could not resend.");
    } finally {
      setBusy(null);
    }
  }

  async function revoke(code: string) {
    if (!window.confirm(`Cancel ${code}? It can no longer be used.`)) return;
    setBusy(code);
    try {
      await revokeFn({ data: { code } });
      toast.success("Code cancelled.");
      await load();
    } catch (e: any) {
      toast.error(e?.message ?? "Could not cancel.");
    } finally {
      setBusy(null);
    }
  }

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? rows.filter((r) => [r.code, r.recipient_email, r.plan_id, r.status].some((v) => v.toLowerCase().includes(q))) : rows;
  }, [rows, query]);

  if (loading) return <OpsState title="Loading promo codes…" />;
  if (!allowed) return <OpsState title="Admin access required" description="Only admins can create promo codes." />;

  const perks = GIFT_PLAN_PERKS[plan];
  const fmt = (d: string | null) => (d ? new Date(d).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : "—");

  return (
    <OpsPage
      title="Promo codes"
      description="Give one email Pro, Elite or Ultra for any 1 to 12 months"
      icon={<Gift />}
      actions={
        <button type="button" onClick={() => void load()} className={ops.btn}>
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </button>
      }
      tabs={
        <>
          <OpsTab active={tab === "create"} onClick={() => setTab("create")}>Create & send</OpsTab>
          <OpsTab active={tab === "codes"} onClick={() => setTab("codes")}>
            All codes <span className="ml-1.5 tabular-nums text-muted-foreground">{rows.length}</span>
          </OpsTab>
        </>
      }
    >
      {tab === "create" ? (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
          <OpsSection>
            <form
              className="space-y-5"
              onSubmit={(e) => {
                e.preventDefault();
                void create(true);
              }}
            >
              <div className="space-y-2">
                <div className="text-[13px] font-medium text-foreground">Plan</div>
                <Segmented label="Plan" value={plan} options={GIFT_PLANS} onChange={setPlan} render={(p) => GIFT_PLAN_PERKS[p].name} />
              </div>
              <div className="space-y-2">
                <div className="text-[13px] font-medium text-foreground">Duration</div>
                <Segmented label="Duration" value={months} options={GIFT_MONTHS} onChange={setMonths} render={(m) => `${m} mo`} />
              </div>
              <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_160px]">
                <label className="block space-y-2">
                  <span className="text-[13px] font-medium text-foreground">Customer email</span>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className={ops.input}
                    autoComplete="off"
                  />
                </label>
                <label className="block space-y-2">
                  <span className="text-[13px] font-medium text-foreground">Apply within (days)</span>
                  <input type="number" min={1} max={365} value={validDays} onChange={(e) => setValidDays(e.target.value)} className={ops.input} />
                </label>
              </div>
              <label className="block space-y-2">
                <span className="text-[13px] font-medium text-foreground">
                  Personal note <span className="font-normal text-muted-foreground">(optional, shown in the email)</span>
                </span>
                <input value={note} maxLength={240} onChange={(e) => setNote(e.target.value)} placeholder="Thanks for being with Jenvu." className={ops.input} />
              </label>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button type="submit" disabled={!emailOk || !!busy} className={ops.btnPrimary}>
                  <Send className="h-3.5 w-3.5" /> {busy === "send" ? "Sending…" : "Create & email code"}
                </button>
                <button type="button" disabled={!emailOk || !!busy} onClick={() => void create(false)} className={ops.btn}>
                  {busy === "create" ? "Creating…" : "Create only"}
                </button>
              </div>
            </form>

            {last && (
              <div className="mt-5 rounded-xl border border-border p-4">
                <div className="flex flex-wrap items-center gap-2 text-[12.5px] text-muted-foreground">
                  {last.emailed ? <Check className="h-3.5 w-3.5 text-gc-success" /> : null}
                  {last.emailed ? `Emailed to ${last.email}` : `Created for ${last.email} (not emailed)`}
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <code className="min-w-0 flex-1 break-all font-mono text-[15px] tracking-wider text-foreground">{last.code}</code>
                  <button type="button" onClick={() => void copy(last.code)} className={ops.btn}>
                    <Copy className="h-3.5 w-3.5" /> Copy
                  </button>
                </div>
              </div>
            )}
          </OpsSection>

          <OpsSection>
            <div className="text-[12px] text-muted-foreground">Customer gets</div>
            <div className="mt-1 text-[22px] font-medium text-foreground">
              {perks.name} · {monthsLabel(months)}
            </div>
            <ul className="mt-4 space-y-2.5">
              {perks.perks.map((p) => (
                <li key={p} className="flex items-start gap-2 text-[13px] text-foreground">
                  <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gc-success" /> {p}
                </li>
              ))}
            </ul>
            <div className="mt-5 space-y-1.5 border-t border-border pt-4 text-[12.5px] text-muted-foreground">
              <p>Works once, only when signed in with this email.</p>
              <p>Applied from Billing → Redeem promo code.</p>
              <p>API credit is refilled every 30 days until the plan ends.</p>
            </div>
          </OpsSection>
        </div>
      ) : (
        <>
          <OpsStats
            items={[
              { label: "Total codes", value: rows.length },
              { label: "Waiting", value: rows.filter((r) => r.status === "active").length, tone: "info" },
              { label: "Used", value: rows.filter((r) => r.status === "redeemed").length, tone: "success" },
              { label: "Cancelled", value: rows.filter((r) => r.status === "revoked").length },
            ]}
          />
          <div className="pt-2">
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search code, email, plan…" className={`${ops.input} sm:w-80`} />
          </div>
          {visible.length === 0 ? (
            <OpsState title="No promo codes yet" description="Create one from the Create & send tab." />
          ) : (
            <div className={ops.tableWrap}>
              <table className={ops.table}>
                <thead className={ops.thead}>
                  <tr>
                    <th className={ops.th}>Code</th>
                    <th className={ops.th}>Plan</th>
                    <th className={ops.th}>Email</th>
                    <th className={ops.th}>Status</th>
                    <th className={ops.th}>Apply by</th>
                    <th className={ops.th}>Plan ends</th>
                    <th className={ops.th}>Created</th>
                    <th className={`${ops.th} text-right`}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((r) => (
                    <tr key={r.code} className={ops.tr}>
                      <td className={`${ops.td} font-mono text-[12.5px]`}>{r.code}</td>
                      <td className={ops.td}>
                        {GIFT_PLAN_PERKS[r.plan_id as GiftPlanId]?.name ?? r.plan_id} · {monthsLabel(r.months)}
                      </td>
                      <td className={ops.td}>{r.recipient_email}</td>
                      <td className={ops.td}>
                        <OpsBadge tone={STATUS_TONE[r.status] ?? "neutral"}>
                          {r.status === "active" ? (r.email_sent_at ? "Sent" : "Not sent") : r.status === "redeemed" ? "Used" : "Cancelled"}
                        </OpsBadge>
                      </td>
                      <td className={`${ops.td} text-muted-foreground`}>{fmt(r.expires_at)}</td>
                      <td className={`${ops.td} text-muted-foreground`}>{fmt(r.plan_ends_at)}</td>
                      <td className={`${ops.td} text-muted-foreground`}>{fmt(r.created_at)}</td>
                      <td className={`${ops.td} text-right`}>
                        <div className="inline-flex items-center gap-1.5">
                          <button type="button" onClick={() => void copy(r.code)} className={`${ops.btn} h-8 px-3`} aria-label={`Copy ${r.code}`}>
                            <Copy className="h-3.5 w-3.5" />
                          </button>
                          {r.status === "active" && (
                            <>
                              <button type="button" disabled={busy === r.code} onClick={() => void resend(r.code)} className={`${ops.btn} h-8 px-3`}>
                                Resend
                              </button>
                              <button type="button" disabled={busy === r.code} onClick={() => void revoke(r.code)} className={`${ops.btn} h-8 px-3`}>
                                Cancel
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </OpsPage>
  );
}
