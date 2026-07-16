import * as React from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Check, Users, DollarSign, Shield, Sparkles, ArrowRight, TrendingUp, Lock, Zap, Target, Clock } from "lucide-react";
import SiteFooter from "@/components/SiteFooter";
import HeaderAuthButtons from "@/components/HeaderAuthButtons";
import { submitFoundingApplication, foundingStats } from "@/lib/founding.functions";

export const Route = createFileRoute("/founding")({
  head: () => ({
    meta: [
      { title: "Founding Trader Program" },
      {
        name: "description",
        content:
          "100 traders per month get free Elite access. Pay only after your first $100 profit. Institutional-grade XAU intelligence, aligned incentives.",
      },
      { property: "og:title", content: "Founding Trader Program" },
      {
        property: "og:description",
        content: "Free Elite plan for 30 days. Pay only after you profit $100.",
      },
      { property: "og:url", content: "https://jenvu.com/founding" },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: "https://jenvu.com/founding" }],
  }),
  component: FoundingPage,
});

function FoundingPage() {
  const submit = useServerFn(submitFoundingApplication);
  const stats = useServerFn(foundingStats);
  const [submitting, setSubmitting] = React.useState(false);
  const [submitted, setSubmitted] = React.useState(false);
  const [seats, setSeats] = React.useState<{ filled: number; total: number }>({ filled: 0, total: 100 });

  React.useEffect(() => {
    stats()
      .then((s) => setSeats({ filled: s.seatsFilled, total: s.seatsTotal }))
      .catch(() => {});
  }, []);

  const remaining = Math.max(0, seats.total - seats.filled);
  const pct = Math.min(100, Math.round((seats.filled / seats.total) * 100));

  const [plan, setPlan] = React.useState<"free" | "pro" | "elite" | "ultra">("elite");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setSubmitting(true);
    try {
      const res = await submit({
        data: {
          full_name: String(fd.get("full_name") || ""),
          email: String(fd.get("email") || ""),
          country: String(fd.get("country") || ""),
          broker: String(fd.get("broker") || ""),
          experience_years: fd.get("experience_years") ? Number(fd.get("experience_years")) : undefined,
          monthly_volume_usd: fd.get("monthly_volume_usd") ? Number(fd.get("monthly_volume_usd")) : undefined,
          why_joining: String(fd.get("why_joining") || ""),
          myfxbook_url: String(fd.get("myfxbook_url") || ""),
          requested_plan: plan,
        } as any,
      });
      if (res.ok) {
        setSubmitted(true);
        toast.success("Application received. We'll be in touch.");
      } else {
        toast.error(res.error);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-white text-zinc-900" style={{ fontFamily: "'Google Sans', 'Urbanist', system-ui, sans-serif" }}>
      <header className="sticky top-0 z-30 border-b border-zinc-100 bg-white/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3.5">
          <Link to="/" className="text-[15px] font-semibold tracking-tight">Jenvu</Link>
          <HeaderAuthButtons />
        </div>
      </header>

      {/* HERO */}
      <section className="relative overflow-hidden border-b border-zinc-100">
        {/* subtle grid backdrop */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.35]"
          style={{
            backgroundImage:
              "linear-gradient(to right, rgba(0,0,0,0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,0,0,0.04) 1px, transparent 1px)",
            backgroundSize: "44px 44px",
            maskImage: "radial-gradient(ellipse at top, black 30%, transparent 75%)",
            WebkitMaskImage: "radial-gradient(ellipse at top, black 30%, transparent 75%)",
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -top-24 left-1/2 h-72 w-[720px] -translate-x-1/2 rounded-full blur-3xl"
          style={{ background: "radial-gradient(closest-side, rgba(24,24,27,0.10), transparent)" }}
        />

        <div className="relative mx-auto max-w-4xl px-5 pt-16 pb-14 text-center sm:pt-20">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-3 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-zinc-600 shadow-sm">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-70" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
            </span>
            Cohort open · {remaining} of {seats.total} seats left
          </div>

          <h1 className="mt-6 text-[40px] font-semibold leading-[1.05] tracking-tight sm:text-6xl">
            Trade with us.
            <br />
            <span className="bg-gradient-to-b from-zinc-900 to-zinc-500 bg-clip-text text-transparent">
              Pay only when it works.
            </span>
          </h1>

          <p className="mx-auto mt-5 max-w-2xl text-[15px] leading-relaxed text-zinc-600 sm:text-base">
            The Founding Trader Program hand-picks <span className="font-semibold text-zinc-900">100 traders each month</span> and
            gives them <span className="font-semibold text-zinc-900">Elite access free for 30 days</span>. Billing only
            starts after your <span className="font-semibold text-zinc-900">first $100 in verified profit</span>. Don't profit — don't pay.
          </p>

          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <a
              href="#apply"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-zinc-900 px-5 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:bg-zinc-800 hover:shadow-md"
            >
              Apply for a seat <ArrowRight className="h-4 w-4" />
            </a>
            <Link
              to="/signal"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-5 py-3 text-sm font-semibold text-zinc-900 transition-colors hover:border-zinc-400"
            >
              See the platform
            </Link>
          </div>

          {/* Seat meter */}
          <div className="mx-auto mt-10 max-w-md rounded-2xl border border-zinc-200 bg-white/70 p-5 shadow-sm backdrop-blur">
            <div className="flex items-center justify-between text-[11px] uppercase tracking-wider text-zinc-500">
              <span>Seats claimed · this month</span>
              <span className="font-semibold text-zinc-900">{seats.filled} / {seats.total}</span>
            </div>
            <div className="mt-2.5 h-2 overflow-hidden rounded-full bg-zinc-100">
              <div
                className="h-full rounded-full bg-gradient-to-r from-zinc-900 to-zinc-600 transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
            <div className="mt-2 flex items-center justify-between text-[11px] text-zinc-500">
              <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" /> Resets on the 1st</span>
              <span>{remaining} spots left</span>
            </div>
          </div>

          {/* Trust stats */}
          <div className="mx-auto mt-10 grid max-w-3xl grid-cols-3 gap-3 sm:gap-6">
            {[
              { k: "$0", v: "Upfront to join" },
              { k: "30 days", v: "Elite plan free" },
              { k: "$100", v: "Profit before billing" },
            ].map((s) => (
              <div key={s.v} className="rounded-2xl border border-zinc-200 bg-white p-4 text-left">
                <div className="text-xl font-semibold tracking-tight text-zinc-900 sm:text-2xl">{s.k}</div>
                <div className="mt-0.5 text-[11px] uppercase tracking-wider text-zinc-500">{s.v}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* WHY */}
      <section className="mx-auto max-w-5xl px-5 py-16">
        <div className="mb-8 max-w-2xl">
          <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-zinc-500">Why we built this</div>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">A program that only wins when you do.</h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            { icon: Users, title: "Curated cohort", body: "Only 100 traders each month. Serious applicants, real capital, no tire-kickers." },
            { icon: DollarSign, title: "Pay after profit", body: "First month Elite is free. Billing activates only after $100 verified profit." },
            { icon: Shield, title: "Aligned incentives", body: "We win when you win. Our job is to make you stable, not to milk subscriptions." },
            { icon: Target, title: "Institutional edge", body: "ICT / SMC engine, blended AI confidence, killzone-aware alerts across XAU pairs." },
            { icon: Zap, title: "Realtime alerts", body: "The moment a valid setup fires — email, in-app and voice brief. No lag, no noise." },
            { icon: Lock, title: "Invite-only access", body: "This program is closed by design. It keeps the cohort small and the quality high." },
          ].map((b) => (
            <div key={b.title} className="group rounded-2xl border border-zinc-200 bg-white p-5 transition-all hover:-translate-y-0.5 hover:border-zinc-300 hover:shadow-sm">
              <div className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-900 text-white">
                <b.icon className="h-4.5 w-4.5" />
              </div>
              <div className="mt-4 text-sm font-semibold">{b.title}</div>
              <div className="mt-1.5 text-[13px] leading-relaxed text-zinc-600">{b.body}</div>
            </div>
          ))}
        </div>
      </section>

      {/* HOW */}
      <section className="mx-auto max-w-4xl px-5 pb-16">
        <div className="overflow-hidden rounded-3xl border border-zinc-200 bg-gradient-to-b from-zinc-50 to-white p-8 sm:p-10">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-zinc-500" />
            <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-zinc-500">Four steps</div>
          </div>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight">How it works</h2>
          <ol className="mt-8 grid gap-5 sm:grid-cols-2">
            {[
              ["Apply", "Fill the short form below. We review every application manually within 48 hours."],
              ["Get approved", "If accepted, we activate your Elite plan free for 30 days — full signals, alerts, killzones, voice."],
              ["Trade & prove it", "Connect your broker (MyFxBook or statement). You have 90 days to reach $100 verified profit."],
              ["Pay only if you profit", "Cross $100 profit — your plan activates. Cancel anytime. No profit in 90 days? You walk. No charge."],
            ].map(([t, d], i) => (
              <li key={t} className="relative flex gap-4 rounded-2xl border border-zinc-200 bg-white p-5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-zinc-900 text-sm font-semibold text-white">
                  {String(i + 1).padStart(2, "0")}
                </div>
                <div>
                  <div className="text-[15px] font-semibold text-zinc-900">{t}</div>
                  <div className="mt-1 text-[13px] leading-relaxed text-zinc-600">{d}</div>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>


      <section id="apply" className="mx-auto max-w-2xl px-5 pb-24">
        <div className="relative rounded-3xl border border-zinc-200 bg-white p-7 shadow-[0_1px_0_rgba(0,0,0,0.04),0_20px_60px_-30px_rgba(0,0,0,0.25)] sm:p-9">
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-zinc-500">Application</div>
              <h2 className="mt-1 text-2xl font-semibold tracking-tight">Apply for a founding seat</h2>
              <p className="mt-1.5 text-[13px] text-zinc-500">
                Reviewed within 48 hours. Serious traders only — please be honest.
              </p>
            </div>
            <div className="hidden shrink-0 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-right sm:block">
              <div className="text-[10px] uppercase tracking-wider text-zinc-500">Seats left</div>
              <div className="text-lg font-semibold text-zinc-900">{remaining}</div>
            </div>
          </div>


          {submitted ? (
            <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-center">
              <Check className="mx-auto h-8 w-8 text-emerald-600" />
              <div className="mt-3 text-base font-semibold text-emerald-900">Application received</div>
              <p className="mt-1 text-sm text-emerald-800">
                We'll email you within 48 hours. Meanwhile,{" "}
                <Link to="/signal" className="underline">explore the platform</Link>.
              </p>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="mt-6 space-y-4">
              <Field name="full_name" label="Full name" required placeholder="Your full name" />
              <Field name="email" label="Email" type="email" required placeholder="you@example.com" />

              <div>
                <label className="text-[13px] font-medium text-zinc-800">
                  Which plan do you want? <span className="text-rose-500">*</span>
                </label>
                <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {([
                    { id: "free", label: "Free", desc: "$0 — try it" },
                    { id: "pro", label: "Pro", desc: "$15 wallet" },
                    { id: "elite", label: "Elite", desc: "$50 wallet" },
                    { id: "ultra", label: "Ultra", desc: "$100 wallet" },
                  ] as const).map((p) => {
                    const active = plan === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setPlan(p.id)}
                        className={`rounded-xl border px-3 py-2.5 text-left transition ${
                          active
                            ? "border-zinc-900 bg-zinc-900 text-white"
                            : "border-zinc-200 bg-white text-zinc-900 hover:border-zinc-400"
                        }`}
                      >
                        <div className="text-[13px] font-semibold">{p.label}</div>
                        <div className={`text-[11px] ${active ? "text-zinc-300" : "text-zinc-500"}`}>{p.desc}</div>
                      </button>
                    );
                  })}
                </div>
                <p className="mt-1.5 text-[11px] text-zinc-500">Approved applicants get this plan free for 30 days.</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field name="country" label="Country" placeholder="Pakistan" />
                <Field name="broker" label="Broker" placeholder="IC Markets, Exness…" />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field name="experience_years" label="Experience (years)" type="number" placeholder="3" />
                <Field name="monthly_volume_usd" label="Avg. monthly volume ($)" type="number" placeholder="10000" />
              </div>
              <Field
                name="myfxbook_url"
                label="MyFxBook / verified track record (optional)"
                placeholder="https://myfxbook.com/…"
              />
              <div>
                <label className="text-[13px] font-medium text-zinc-800">
                  Why do you want in? <span className="text-rose-500">*</span>
                </label>
                <textarea
                  name="why_joining"
                  required
                  minLength={10}
                  maxLength={1500}
                  rows={4}
                  placeholder="Tell us about your trading journey and what stability would mean for you…"
                  className="mt-1.5 w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-[14px] outline-none placeholder:text-zinc-400 focus:border-zinc-900"
                />
              </div>

              <button
                type="submit"
                disabled={submitting || remaining === 0}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-zinc-900 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-zinc-800 disabled:opacity-60"
              >
                {submitting ? "Submitting…" : remaining === 0 ? "This month is full — join waitlist" : "Submit application"}
                <ArrowRight className="h-4 w-4" />
              </button>

              <p className="text-[11px] leading-relaxed text-zinc-500">
                By applying you agree to our{" "}
                <Link to="/terms" className="underline">Terms</Link> and{" "}
                <Link to="/disclaimer" className="underline">Risk Disclaimer</Link>. Trading involves
                risk. Past performance does not guarantee future results.
              </p>
            </form>
          )}
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}

function Field(props: {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="text-[13px] font-medium text-zinc-800">
        {props.label}
        {props.required && <span className="text-rose-500"> *</span>}
      </label>
      <input
        name={props.name}
        type={props.type ?? "text"}
        required={props.required}
        placeholder={props.placeholder}
        className="mt-1.5 w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-[14px] outline-none placeholder:text-zinc-400 focus:border-zinc-900"
      />
    </div>
  );
}
