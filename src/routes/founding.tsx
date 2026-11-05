import JenvuMark from "@/components/JenvuMark";
import * as React from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import BlogFooter from "@/components/BlogFooter";
import SiteHeader from "@/components/SiteHeader";
import { submitFoundingApplication, foundingStats } from "@/lib/founding.functions";

export const Route = createFileRoute("/founding")({
  head: () => ({
    meta: [
      { title: "Founding Trader Program — Jenvu" },
      {
        name: "description",
        content:
          "Invite-only program for 50 Gold, Bitcoin and EUR/USD traders a month. Approved traders get 3 months of their chosen plan with $250 credit and verify their ID within 2 days.",
      },
      { property: "og:title", content: "Founding Trader Program" },
      {
        property: "og:description",
        content: "Approval unlocks 3 months of your chosen plan with $250 credit. Verify your ID within 2 days to keep access.",
      },
      { property: "og:url", content: "https://jenvu.com/founding" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
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
    <div className={`public-cloudflare min-h-dvh w-full bg-background text-gc-ink ${SANS} antialiased`}>
      <SiteHeader />

      <main className="grid w-full grid-cols-1 lg:grid-cols-[1fr_minmax(360px,30%)]">
        {/* LEFT — form */}
        <section id="apply" className="scroll-mt-24 px-5 py-12 sm:px-10 lg:py-14 lg:pl-[12%] lg:pr-16">
          <div className="max-w-[710px]">
            <span className="inline-flex items-center rounded-full border border-gc-line px-3.5 py-1 text-[13px] font-medium text-gc-ink-muted">Invite-only · {remaining} seats left</span>
            <h1 className="mt-4 text-[2.4rem] font-medium leading-[1.08] tracking-tight sm:text-[3.4rem]">
              Founding Trader Program
            </h1>
            <ul className="mt-6 space-y-3 text-[17px] text-gc-ink-muted">
              {[
                "3 months of your chosen plan with $250 credit",
                "Only 50 traders accepted each month",
                "Verify your ID within 2 days to keep access",
              ].map((t) => (
                <li key={t} className="flex items-center gap-4">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="shrink-0 text-gc-blue"><polyline points="4 12 10 18 20 6" /></svg>
                  {t}
                </li>
              ))}
            </ul>

            {submitted ? (
              <div className="mt-8 rounded-md border border-gc-line p-6" role="status" aria-live="polite">
                <h2 className="text-[22px] font-medium tracking-tight">Application received.</h2>
                <p className="mt-2 text-gc-ink-muted">
                  Thanks — our team will review it and email you a decision within <span className="font-medium text-gc-ink">48 hours</span>. Please check your inbox and spam folder.
                </p>
                <Link to="/" className="mt-5 inline-block text-sm font-medium text-gc-blue hover:underline">
                  Back to home
                </Link>
              </div>
            ) : (
              <form onSubmit={onSubmit} className="mt-8 space-y-6">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field name="full_name" label="Full name*" required />
                  <Field name="email" label="Email*" type="email" required />
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field name="whatsapp_number" label="WhatsApp number*" type="tel" required />
                  <Field name="country" label="Country (optional)" />
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field name="broker" label="Broker (optional)" />
                  <Field name="experience_years" label="Experience in years (optional)" type="number" />
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field key={`ref-${refEmail}`} name="referrer_email" label="Referred by email (optional)" type="email" defaultValue={refEmail} />
                  <Field name="myfxbook_url" label="MyFxBook link (optional)" />
                </div>

                <div>
                  <p className="text-[15px] text-gc-ink-muted">Which plan do you want?*</p>
                  <div className="mt-1.5 grid grid-cols-3 gap-3">
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
                          aria-pressed={active}
                          className={`rounded-md border px-4 py-3 text-left transition ${active ? "border-gc-ink bg-gc-pill" : "border-gc-line bg-background hover:bg-gc-surface"}`}
                        >
                          <div className="text-[15px] font-medium text-gc-ink">{p.label}</div>
                          <div className="text-[13px] text-gc-ink-muted">{p.desc}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label htmlFor="f-why" className="text-[15px] text-gc-ink-muted">Why do you want in?*</label>
                  <textarea
                    id="f-why"
                    name="why_joining"
                    required
                    minLength={10}
                    maxLength={1500}
                    rows={4}
                    placeholder="Tell us about your trading journey."
                    className={`${INPUT} mt-1.5 min-h-[104px] resize-y`}
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting || remaining === 0}
                  className="inline-flex items-center rounded-full bg-gc-blue px-6 py-3 text-[15px] font-medium text-gc-on-blue transition-colors hover:bg-gc-blue-hover disabled:opacity-60"
                >
                  {submitting ? "Submitting…" : remaining === 0 ? "This month is full" : "Submit application"}
                </button>
                <p className="text-[16px] text-gc-ink-muted">
                  By applying you agree to Jenvu's{" "}
                  <Link to="/terms" className="font-medium text-gc-blue underline underline-offset-2">Terms</Link> and{" "}
                  <Link to="/disclaimer" className="font-medium text-gc-blue underline underline-offset-2">Risk Disclaimer</Link>. Trading involves significant risk.
                </p>
              </form>
            )}
          </div>
        </section>

        {/* RIGHT — cards */}
        <aside className="relative overflow-hidden border-t border-gc-line px-5 py-10 sm:px-10 lg:border-l lg:border-t-0 lg:py-14">
          <div aria-hidden className="pointer-events-none absolute inset-0 opacity-60" style={{ backgroundImage: "var(--platform-aurora-1)" }} />
          <div className="relative max-w-[370px] space-y-4">
            <div className="rounded-md border border-gc-line bg-background p-6 shadow-sm">
              <JenvuMark className="h-10 w-10 text-foreground" />
              <h2 className="mt-4 text-[22px] font-medium tracking-tight">Seats this month</h2>
              <div className="mt-5 flex items-center justify-between text-[14px] text-gc-ink-muted">
                <span>Claimed</span>
                <span className="font-medium text-gc-ink">{seats.filled} / {seats.total}</span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-gc-pill">
                <div className="h-full rounded-full bg-gc-blue transition-all duration-700 ease-out" style={{ width: `${pct}%` }} />
              </div>
              <p className="mt-3 text-[15px] text-gc-ink-muted">{remaining} spots remaining</p>
            </div>
            <SideCard text="We review every application by hand and reply within 48 hours." />
            <SideCard text="Once approved, upload your ID from your account within 2 days to keep access." />
            <SideCard text="Questions about the program? Email our team." link="support@jenvu.com" href="mailto:support@jenvu.com" />
            <SideCard text="Prefer to start right away without applying?" link="See plans and pricing" href="/pricing" />
          </div>
        </aside>
      </main>

      <BlogFooter />
    </div>
  );
}

function SideCard({ text, link, href }: { text: string; link?: string; href?: string }) {
  return (
    <div className="rounded-md border border-gc-line bg-background/95 p-5 shadow-sm">
      <p className="text-[15px] leading-relaxed">{text}</p>
      {link && href && <a href={href} className="mt-4 inline-block text-[15px] font-medium text-gc-blue hover:underline">{link}</a>}
    </div>
  );
}

const SANS = "font-['Google_Sans_Flex','Google_Sans','Product_Sans','Poppins',system-ui,sans-serif]";
const INPUT = "w-full rounded-md border border-gc-line bg-background px-4 py-4 text-[16px] text-gc-ink outline-none transition placeholder:text-gc-ink-muted focus:border-gc-blue focus:ring-1 focus:ring-gc-blue";

function Field(props: { name: string; label: string; type?: string; required?: boolean; defaultValue?: string }) {
  const id = `f-${props.name}`;
  return (
    <div>
      <label htmlFor={id} className="sr-only">{props.label}</label>
      <input
        id={id}
        name={props.name}
        type={props.type ?? "text"}
        required={props.required}
        placeholder={props.label}
        defaultValue={props.defaultValue}
        className={INPUT}
      />
    </div>
  );
}
