import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Copy, Share2, Gift, Users, Check, Sparkles, ArrowRight } from "lucide-react";
import { getReferralInfo, applyReferralCode, type ReferralInfo } from "@/lib/referrals.functions";

export const Route = createFileRoute("/_authenticated/dashboard/referrals")({
  head: () => ({
    meta: [
      { title: "Referrals — Jenvu" },
      { name: "description", content: "Invite friends, earn credits when they upgrade." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ReferralsPage,
});

function ReferralsPage() {
  const fetchInfo = useServerFn(getReferralInfo);
  const applyCode = useServerFn(applyReferralCode);
  const [info, setInfo] = useState<ReferralInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [codeInput, setCodeInput] = useState("");
  const [copied, setCopied] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await fetchInfo();
      setInfo(data);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load referrals");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const copyLink = async () => {
    if (!info) return;
    try {
      await navigator.clipboard.writeText(info.shareUrl);
      setCopied(true);
      toast.success("Referral link copied");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Copy failed");
    }
  };

  const shareLink = async () => {
    if (!info) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Jenvu — precision gold trade signals",
          text: "Join me on Jenvu. Use my link to get 50 bonus credits when you upgrade.",
          url: info.shareUrl,
        });
      } catch { /* user cancelled */ }
    } else {
      void copyLink();
    }
  };

  const submitCode = async () => {
    const c = codeInput.trim().toUpperCase();
    if (!c) return;
    setSubmitting(true);
    try {
      const res = await applyCode({ data: { code: c } });
      if (res.ok) {
        toast.success("Referral applied. You'll earn 50 credits when you upgrade to a paid plan.");
        setCodeInput("");
        await load();
      } else {
        const msgs: Record<string, string> = {
          invalid_code: "That code isn't valid.",
          self_referral: "You can't refer yourself.",
          already_referred: "A referral is already applied to this account.",
          duplicate_email: "Referrer's email matches yours — not allowed.",
        };
        toast.error(msgs[res.error ?? ""] ?? "Could not apply code");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !info) {
    return <div className="px-6 py-16 text-center text-sm text-zinc-500">Loading…</div>;
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900 tracking-tight">Refer & Earn</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Share your link. When a friend upgrades to Pro or Elite, you get{" "}
          <span className="font-medium text-emerald-600">100 credits</span> and they get{" "}
          <span className="font-medium text-emerald-600">50 credits</span>.
        </p>
      </div>

      {/* Share card */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-6">
        <div className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
          Your referral link
        </div>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
          <input
            readOnly
            value={info.shareUrl}
            className="flex-1 rounded-lg border border-zinc-200 bg-white px-3 py-2.5 font-mono text-[13px] text-zinc-900"
            onFocus={(e) => e.currentTarget.select()}
          />
          <div className="flex gap-2">
            <button
              onClick={copyLink}
              className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
            >
              {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
              {copied ? "Copied" : "Copy"}
            </button>
            <button
              onClick={shareLink}
              className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800"
            >
              <Share2 className="h-4 w-4" /> Share
            </button>
          </div>
        </div>
        <div className="mt-3 text-xs text-zinc-500">
          Your code: <span className="font-mono font-semibold text-zinc-800">{info.code}</span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard icon={Users} label="Invites sent" value={info.totals.pending + info.totals.converted} />
        <StatCard icon={Check} label="Converted" value={info.totals.converted} accent="emerald" />
        <StatCard icon={Gift} label="Credits earned" value={info.totals.credits_earned} accent="emerald" />
      </div>

      {/* Redeem code (if not yet referred) */}
      {!info.incoming && (
        <div className="rounded-xl border border-zinc-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-zinc-900">Have a friend's code?</h2>
          <p className="mt-1 text-xs text-zinc-500">
            Enter it before upgrading to earn 50 bonus credits.
          </p>
          <div className="mt-3 flex gap-2">
            <input
              value={codeInput}
              onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
              placeholder="ABC12345"
              maxLength={12}
              className="flex-1 rounded-lg border border-zinc-200 bg-white px-3 py-2 font-mono text-sm uppercase text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
            />
            <button
              onClick={submitCode}
              disabled={submitting || codeInput.trim().length < 4}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              Apply
            </button>
          </div>
        </div>
      )}

      {info.incoming && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
          {info.incoming.status === "converted" ? (
            <>Referral bonus of {info.incoming.credits_awarded} credits applied. </>
          ) : (
            <>A referral is attached to your account. Upgrade to Pro or Elite to unlock your 50 bonus credits.{" "}
              <Link to="/pricing" className="font-medium underline">See plans <ArrowRight className="inline h-3 w-3" /></Link>
            </>
          )}
        </div>
      )}

      {/* History table */}
      <ReferralHistory referrals={info.referrals} />
    </div>
  );
}

type FilterKey = "all" | "new" | "converted" | "upgraded";

function ReferralHistory({ referrals }: { referrals: ReferralInfo["referrals"] }) {
  const [filter, setFilter] = useState<FilterKey>("all");

  const counts = {
    all: referrals.length,
    new: referrals.filter((r) => r.status === "pending").length,
    converted: referrals.filter((r) => r.status === "converted").length,
    upgraded: referrals.filter((r) => r.status === "converted" && r.credits_awarded > 0).length,
  };

  const filtered = referrals.filter((r) => {
    if (filter === "all") return true;
    if (filter === "new") return r.status === "pending";
    if (filter === "converted") return r.status === "converted";
    if (filter === "upgraded") return r.status === "converted" && r.credits_awarded > 0;
    return true;
  });

  const FILTERS: { key: FilterKey; label: string; hint: string }[] = [
    { key: "all", label: "All", hint: "Every referral" },
    { key: "new", label: "New", hint: "Signed up, not upgraded" },
    { key: "converted", label: "Converted", hint: "Completed referral" },
    { key: "upgraded", label: "Upgraded", hint: "Paid plan — credits earned" },
  ];

  return (
    <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-zinc-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-sm font-semibold text-zinc-900">Referral history</div>
          <div className="text-[11px] text-zinc-500">{FILTERS.find((f) => f.key === filter)?.hint}</div>
        </div>
        <div className="flex flex-wrap gap-1">
          {FILTERS.map((f) => {
            const active = filter === f.key;
            return (
              <button
                key={f.key}
                type="button"
                onClick={() => setFilter(f.key)}
                className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[12px] font-medium transition ${
                  active
                    ? "bg-zinc-900 text-white"
                    : "border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
                }`}
              >
                {f.label}
                <span
                  className={`inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-semibold tabular-nums ${
                    active ? "bg-white/20 text-white" : "bg-zinc-100 text-zinc-600"
                  }`}
                >
                  {counts[f.key]}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="px-6 py-12 text-center text-sm text-zinc-500">
          {referrals.length === 0
            ? "No referrals yet. Share your link to get started."
            : "No referrals match this filter."}
        </div>
      ) : (
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-[11px] uppercase text-zinc-500">
            <tr>
              <th className="px-4 py-2 text-left font-medium">Date</th>
              <th className="px-4 py-2 text-left font-medium">Stage</th>
              <th className="px-4 py-2 text-left font-medium">Upgraded on</th>
              <th className="px-4 py-2 text-right font-medium">Credits</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {filtered.map((r) => {
              const upgraded = r.status === "converted" && r.credits_awarded > 0;
              const stageLabel = upgraded ? "Upgraded" : r.status === "converted" ? "Converted" : r.status === "void" ? "Void" : "New";
              const stageClass = upgraded
                ? "bg-emerald-100 text-emerald-700"
                : r.status === "converted"
                ? "bg-sky-100 text-sky-700"
                : r.status === "void"
                ? "bg-zinc-100 text-zinc-500"
                : "bg-amber-100 text-amber-700";
              return (
                <tr key={r.id}>
                  <td className="px-4 py-2.5 text-zinc-600">{new Date(r.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-2.5">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${stageClass}`}>
                      {stageLabel}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-zinc-600">
                    {r.converted_at ? new Date(r.converted_at).toLocaleDateString() : <span className="text-zinc-300">—</span>}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-zinc-900">{r.credits_awarded}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}


function StatCard({ icon: Icon, label, value, accent }: { icon: typeof Users; label: string; value: number; accent?: "emerald" }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4">
      <div className="flex items-center gap-2 text-xs text-zinc-500">
        <Icon className="h-3.5 w-3.5" /> {label}
      </div>
      <div className={`mt-1 text-2xl font-semibold tracking-tight ${accent === "emerald" ? "text-emerald-600" : "text-zinc-900"}`}>
        {value}
      </div>
    </div>
  );
}
