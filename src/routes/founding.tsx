import * as React from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Check, Users, DollarSign, Shield, ArrowRight } from "lucide-react";
import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";
import { submitFoundingApplication, foundingStats } from "@/lib/founding.functions";

export const Route = createFileRoute("/founding")({
  head: () => ({
    meta: [
      { title: "Founding Trader Program — Jenvu" },
      {
        name: "description",
        content:
          "Invite-only program for 50 Fiber traders a month. Approved traders get 3 months of their chosen plan with $250 credit and verify their ID within 2 days.",
      },
      { property: "og:title", content: "Founding Trader Program" },
      {
        property: "og:description",
        content: "Approval unlocks 3 months of your chosen plan with $250 credit. Verify your ID within 2 days to keep access.",
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
  const [seats, setSeats] = React.useState<{ filled: number; total: number }>({ filled: 0, total: 50 });

  React.useEffect(() => {
    let cancelled = false;
    const refresh = () => {
      stats()
        .then((s) => { if (!cancelled) setSeats({ filled: s.seatsFilled, total: s.seatsTotal }); })
        .catch(() => {});
    };
    refresh();
    const interval = window.setInterval(refresh, 10000);
    const onFocus = () => refresh();
    const onVisible = () => { if (document.visibilityState === "visible") refresh(); };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  const remaining = Math.max(0, seats.total - seats.filled);
  const pct = Math.min(100, Math.round((seats.filled / seats.total) * 100));

  const [plan, setPlan] = React.useState<"pro" | "elite" | "ultra">("elite");
  const [refEmail, setRefEmail] = React.useState<string>("");

  React.useEffect(() => {
    try {
      const p = new URLSearchParams(window.location.search);
      const r = p.get("ref") || p.get("referrer") || "";
      if (r) setRefEmail(r);
    } catch {}
  }, []);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setSubmitting(true);
    try {
      const res = await submit({
        data: {
          full_name: String(fd.get("full_name") || ""),
          email: String(fd.get("email") || ""),
          whatsapp_number: String(fd.get("whatsapp_number") || ""),
          country: String(fd.get("country") || ""),
          broker: String(fd.get("broker") || ""),
          experience_years: fd.get("experience_years") ? Number(fd.get("experience_years")) : undefined,
          monthly_volume_usd: fd.get("monthly_volume_usd") ? Number(fd.get("monthly_volume_usd")) : undefined,
          referrer_email: String(fd.get("referrer_email") || ""),
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
    <div className={`min-h-dvh w-full bg-background text-gc-ink ${SANS} antialiased`}>
      <SiteHeader />

      <div className="jenvu-home-content">
        <main>
          {/* Hero — homepage style */}
          <section className="bg-background">
            <div className="mx-auto max-w-[1296px] px-5 pb-12 pt-12 text-center sm:px-8 md:pt-14">
              <img src="/favicon.png" alt="" width={64} height={64} className="jenvu-logo-intro mx-auto h-16 w-16 object-contain" />
              <span className="jenvu-rise mt-6 inline-flex rounded-full bg-gc-blue-soft px-3 py-1 text-[13px] font-medium text-gc-blue-deep">Invite-only · {remaining} seats left this month</span>
              <h1 className="jenvu-rise mx-auto mt-5 max-w-[900px] text-[40px] font-medium leading-[1.1] tracking-[-0.5px] text-gc-ink sm:text-[56px] md:text-[60px]">
                Founding Trader Program
              </h1>
              <p className="jenvu-rise [animation-delay:80ms] mx-auto mt-5 max-w-[760px] text-[16px] leading-[1.6] text-gc-ink-muted sm:text-[17px]">
                Once approved, you get <span className="font-medium text-gc-ink">3 months of your chosen plan with $250 credit</span>, unlocked straight away. You then have <span className="font-medium text-gc-ink">2 days to verify your ID</span> to keep access.
              </p>
              <div className="jenvu-rise [animation-delay:160ms] mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <a href="#apply" className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-gc-blue px-6 text-[16px] font-medium text-gc-on-blue transition hover:bg-gc-blue-hover">
                  Apply for a seat <ArrowRight className="h-4 w-4" />
                </a>
                <Link to="/pricing" className="inline-flex h-12 items-center justify-center rounded-full border border-gc-line bg-background px-6 text-[16px] font-medium text-gc-ink transition hover:bg-gc-surface">
                  Buy now
                </Link>
              </div>

              <div className="jenvu-rise [animation-delay:220ms] mx-auto mt-10 max-w-md rounded-3xl bg-gc-surface p-6 text-left">
                <div className="flex items-center justify-between text-[13px] text-gc-ink-muted">
                  <span>Seats claimed this month</span>
                  <span className="font-medium text-gc-ink">{seats.filled} / {seats.total}</span>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-gc-blue-soft">
                  <div className="h-full rounded-full bg-gc-blue transition-all duration-700 ease-out" style={{ width: `${pct}%` }} />
                </div>
                <div className="mt-2 text-[12px] text-gc-ink-muted">{remaining} spots remaining</div>
              </div>
            </div>
          </section>

          {/* Benefits — homepage card style with tone icons */}
          <section className="bg-background">
            <div className="mx-auto max-w-[1296px] px-5 pb-16 sm:px-8">
              <div className="grid gap-5 md:grid-cols-3">
                {([
                  { icon: Users, tone: "blue", title: "Curated cohort", body: "Only 50 traders each month. Serious applicants, real capital, no tire-kickers." },
                  { icon: DollarSign, tone: "green", title: "Instant access", body: "Approval unlocks 3 months of the plan you picked plus $250 credit, with no waiting." },
                  { icon: Shield, tone: "yellow", title: "Verified traders", body: "Every member verifies their ID within 2 days, so the cohort stays real." },
                ] as const).map((b, i) => (
                  <div key={b.title} className="ind-rise rounded-3xl border border-gc-line bg-background p-7 transition hover:shadow-[0_1px_3px_rgba(60,64,67,0.15),0_4px_12px_rgba(60,64,67,0.12)]" style={{ animationDelay: `${i * 80}ms` }}>
                    <span className={`flex h-12 w-12 items-center justify-center rounded-full ${TONE[b.tone].bg}`}>
                      <b.icon className={`h-6 w-6 ${TONE[b.tone].fg}`} />
                    </span>
                    <h3 className="mt-5 text-[20px] font-medium text-gc-ink">{b.title}</h3>
                    <p className="mt-2 text-[15px] leading-[1.6] text-gc-ink-muted">{b.body}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* How it works */}
          <section className="bg-gc-surface">
            <div className="mx-auto grid max-w-[1296px] gap-10 px-5 py-16 sm:px-8 lg:grid-cols-[0.8fr_1.2fr] lg:py-20">
              <div>
                <h2 className="text-[32px] font-medium leading-[1.2] text-gc-ink sm:text-[40px]">How it works</h2>
                <p className="mt-4 max-w-[420px] text-[16px] leading-[1.6] text-gc-ink-muted">Four simple steps from application to your first chart.</p>
              </div>
              <ol className="space-y-4">
                {[
                  ["Apply", "Fill the short form below. We review every application manually."],
                  ["Get approved", "If accepted, you get 3 months of the plan you picked and $250 credit straight away, including the Terminal."],
                  ["Verify your ID in 2 days", "Upload your ID documents from your account within 2 days of approval."],
                  ["Keep trading", "Once your documents are submitted, your access continues. If they're not sent in time, the Terminal is locked until you verify."],
                ].map(([t, d], i) => (
                  <li key={t} className="flex gap-5 rounded-3xl bg-background p-6">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gc-blue text-[15px] font-medium text-gc-on-blue">{i + 1}</span>
                    <div>
                      <div className="text-[17px] font-medium text-gc-ink">{t}</div>
                      <div className="mt-1 text-[15px] leading-[1.6] text-gc-ink-muted">{d}</div>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </section>

          {/* Application form */}
          <section id="apply" className="scroll-mt-24 bg-background">
            <div className="mx-auto max-w-[760px] px-5 py-16 sm:px-8 lg:py-20">
              <div className="text-center">
                <h2 className="text-[32px] font-medium leading-[1.2] text-gc-ink sm:text-[40px]">Apply for a founding seat</h2>
                <p className="mt-3 text-[16px] text-gc-ink-muted">Applications reviewed within 48 hours. Only serious traders — please be honest.</p>
              </div>

              <div className="mt-10 rounded-3xl border border-gc-line bg-background p-6 sm:p-9">
                {submitted ? (
                  <div className="py-6 text-center" role="status" aria-live="polite">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-gc-green-soft">
                      <Check className="h-7 w-7 text-gc-green" />
                    </div>
                    <h3 className="mt-5 text-[24px] font-medium text-gc-ink">Application received</h3>
                    <p className="mx-auto mt-3 max-w-lg text-[15px] leading-relaxed text-gc-ink-muted">
                      Thank you — we've got your application. Our team will personally review it and email you a decision within <strong className="text-gc-ink">48 hours</strong>.
                    </p>
                    <p className="mt-2 text-[13px] text-gc-ink-muted">Please keep an eye on your inbox (and spam folder).</p>
                    <Link to="/" className="mt-6 inline-flex h-11 items-center justify-center rounded-full bg-gc-blue px-6 text-[15px] font-medium text-gc-on-blue hover:bg-gc-blue-hover">
                      Back to home
                    </Link>
                  </div>
                ) : (
                  <form onSubmit={onSubmit} className="space-y-5">
                    <Field name="full_name" label="Full name" required placeholder="Your full name" />
                    <Field name="email" label="Email" type="email" required placeholder="you@example.com" />
                    <Field name="whatsapp_number" label="WhatsApp number" type="tel" required placeholder="+92 300 1234567" />

                    <div>
                      <label className="text-[14px] font-medium text-gc-ink">
                        Which plan do you want? <span className="text-gc-red">*</span>
                      </label>
                      <div className="mt-2 grid grid-cols-3 gap-2">
                        {([
                          { id: "pro", label: "Pro", desc: "$10 wallet" },
                          { id: "elite", label: "Elite", desc: "$25 wallet" },
                          { id: "ultra", label: "Ultra", desc: "$50 wallet" },
                        ] as const).map((p) => {
                          const active = plan === p.id;
                          return (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => setPlan(p.id)}
                              className={`rounded-2xl border px-4 py-3 text-left transition ${active ? "border-gc-blue bg-gc-blue-soft" : "border-gc-line bg-background hover:bg-gc-surface"}`}
                            >
                              <div className={`text-[14px] font-medium ${active ? "text-gc-blue-deep" : "text-gc-ink"}`}>{p.label}</div>
                              <div className="text-[12px] text-gc-ink-muted">{p.desc}</div>
                            </button>
                          );
                        })}
                      </div>
                      <p className="mt-1.5 text-[12px] text-gc-ink-muted">Approved applicants get this plan for 3 months with $250 credit.</p>
                    </div>
                    <div className="grid gap-5 sm:grid-cols-2">
                      <Field name="country" label="Country" placeholder="Pakistan" />
                      <Field name="broker" label="Broker" placeholder="IC Markets, Exness…" />
                    </div>
                    <div className="grid gap-5 sm:grid-cols-2">
                      <Field name="experience_years" label="Experience (years)" type="number" placeholder="3" />
                      <Field key={`ref-${refEmail}`} name="referrer_email" label="Referred by (optional)" type="email" placeholder="friend@email.com" defaultValue={refEmail} />
                    </div>
                    <Field name="myfxbook_url" label="MyFxBook / verified track record (optional)" placeholder="https://myfxbook.com/…" />
                    <div>
                      <label className="text-[14px] font-medium text-gc-ink">
                        Why do you want in? <span className="text-gc-red">*</span>
                      </label>
                      <textarea
                        name="why_joining"
                        required
                        minLength={10}
                        maxLength={1500}
                        rows={4}
                        placeholder="Tell us about your trading journey and what stability would mean for you…"
                        className={INPUT}
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={submitting || remaining === 0}
                      className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-gc-blue px-6 text-[16px] font-medium text-gc-on-blue transition hover:bg-gc-blue-hover disabled:opacity-60"
                    >
                      {submitting ? "Submitting…" : remaining === 0 ? "This month is full — join waitlist" : "Submit application"}
                      <ArrowRight className="h-4 w-4" />
                    </button>

                    <p className="text-[12px] leading-relaxed text-gc-ink-muted">
                      By applying you agree to our <Link to="/terms" className="text-gc-blue underline">Terms</Link> and <Link to="/disclaimer" className="text-gc-blue underline">Risk Disclaimer</Link>. Futures trading involves significant risk.
                    </p>
                  </form>
                )}
              </div>
            </div>
          </section>
        </main>
      </div>

      <SiteFooter />
    </div>
  );
}

const SANS = "font-['Google_Sans','Product_Sans','Poppins',system-ui,sans-serif]";
const INPUT = "mt-1.5 w-full rounded-xl border border-gc-line bg-background px-4 py-3 text-[15px] text-gc-ink outline-none placeholder:text-gc-ink-muted focus:border-gc-blue focus:ring-1 focus:ring-gc-blue";
const TONE = {
  blue: { bg: "bg-gc-blue-soft", fg: "text-gc-blue" },
  green: { bg: "bg-gc-green-soft", fg: "text-gc-green" },
  yellow: { bg: "bg-gc-yellow-soft", fg: "text-gc-yellow" },
} as const;

function Field(props: {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
  defaultValue?: string;
}) {
  return (
    <div>
      <label className="text-[14px] font-medium text-gc-ink">
        {props.label}
        {props.required && <span className="text-gc-red"> *</span>}
      </label>
      <input
        name={props.name}
        type={props.type ?? "text"}
        required={props.required}
        placeholder={props.placeholder}
        defaultValue={props.defaultValue}
        className={INPUT}
      />
    </div>
  );
}
