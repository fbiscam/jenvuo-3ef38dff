import * as React from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import BlogFooter from "@/components/BlogFooter";
import SiteHeader from "@/components/SiteHeader";
import {
  CALLOUT_BUTTON,
  FORM_SANS,
  FormCallout,
  FormField,
  FormHero,
  RadioCards,
  SUBMIT_BUTTON,
  formInputClass,
} from "@/components/forms/CenteredForm";
import { submitFoundingApplication, foundingStats } from "@/lib/founding.functions";
import { FOUNDING_SEATS_PER_MONTH, formatSeatOpening, nextSeatOpening } from "@/lib/founding-seats";

export const Route = createFileRoute("/founding")({
  head: () => ({
    meta: [
      { title: "Founding Trader Program — Jenvu" },
      {
        name: "description",
        content:
          "Invite-only program for 100 Gold, Bitcoin and EUR/USD traders a month. Approved traders get 1 month of Pro or Elite; $200 credit and JX Bot unlock once their ID is verified within 2 days.",
      },
      { property: "og:title", content: "Founding Trader Program" },
      {
        property: "og:description",
        content: "Approval unlocks 1 month of Pro or Elite. Verify your ID within 2 days to unlock $200 credit and JX Bot.",
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
  const [seats, setSeats] = React.useState<{ filled: number; total: number; nextOpenAt: string }>({ filled: 0, total: FOUNDING_SEATS_PER_MONTH, nextOpenAt: nextSeatOpening().toISOString() });

  React.useEffect(() => {
    let cancelled = false;
    const refresh = () => {
      stats()
        .then((s) => { if (!cancelled) setSeats({ filled: s.seatsFilled, total: s.seatsTotal, nextOpenAt: s.nextOpenAt }); })
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

  const [plan, setPlan] = React.useState<"pro" | "elite">("pro");
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
    <div className={`public-cloudflare min-h-dvh w-full bg-background text-gc-ink ${FORM_SANS} antialiased`}>
      <SiteHeader />

      <main className="w-full px-5 pb-24 pt-20 sm:pt-28">
        <FormHero eyebrow="Founding" title="Founding Trader Program">
          An invite-only program for 100 traders a month. Approved traders get 1 month of Pro or Elite and the Terminal right away; the $200 API credit and JX Bot unlock once their ID is verified (within 2 days). After 30 days the plan, credit and bot access end, and we tell you whether the bot reached $200 profit so you can take your payout and choose a paid plan.
        </FormHero>

        <FormCallout
          action={
            <Link to="/pricing" className={CALLOUT_BUTTON}>
              See plans and pricing
            </Link>
          }
        >
          <span className="text-foreground">{seats.filled} / {seats.total}</span> seats claimed this month · {remaining === 0 ? <>reopens {formatSeatOpening(new Date(seats.nextOpenAt))}</> : <>{remaining} left</>}
          <div className="mx-auto mt-3 h-1.5 max-w-[260px] overflow-hidden rounded-full bg-gc-pill">
            <div className="h-full rounded-full bg-foreground transition-all duration-700 ease-out" style={{ width: `${pct}%` }} />
          </div>
          <p className="mt-3">Prefer to start right away without applying?</p>
        </FormCallout>

        <div id="apply" className="mx-auto mt-16 max-w-[605px] scroll-mt-24">
          {submitted ? (
            <div className="rounded-xl bg-gc-surface p-6 text-center" role="status" aria-live="polite">
              <h2 className="text-[22px] font-normal tracking-tight">Application received.</h2>
              <p className="mt-2 text-[15px] text-gc-ink-muted">
                Our team will review it and email you a decision within <span className="text-foreground">48 hours</span>. Please check your inbox and spam folder.
              </p>
              <Link to="/" className={`${CALLOUT_BUTTON} mt-5`}>Back to home</Link>
            </div>
          ) : remaining === 0 ? (
            <div className="rounded-xl bg-gc-surface p-6 text-center" role="status" aria-live="polite">
              <h2 className="text-[22px] font-normal tracking-tight">Seats are full this month.</h2>
              <p className="mt-2 text-[15px] text-gc-ink-muted">
                All {seats.total} Founding seats for this month are taken. Seats open again on <span className="text-foreground">{formatSeatOpening(new Date(seats.nextOpenAt))}</span>.
              </p>
              <Link to="/pricing" className={`${CALLOUT_BUTTON} mt-5`}>See plans and pricing</Link>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="space-y-7">
              <div className="grid grid-cols-1 gap-x-4 gap-y-7 sm:grid-cols-2">
                <Field name="full_name" label="Full Name" required autoComplete="name" />
                <Field name="email" label="Email" type="email" required autoComplete="email" />
                <Field name="whatsapp_number" label="WhatsApp Number" type="tel" required autoComplete="tel" />
                <Field name="country" label="Country (optional)" autoComplete="country-name" />
                <Field name="broker" label="Broker (optional)" />
                <Field name="experience_years" label="Experience in years (optional)" type="number" />
                <Field key={`ref-${refEmail}`} name="referrer_email" label="Referred by email (optional)" type="email" defaultValue={refEmail} />
                <Field name="myfxbook_url" label="MyFxBook link (optional)" />
              </div>

              <FormField label="Plan" htmlFor="f-plan" required>
                <RadioCards
                  name="requested_plan"
                  value={plan}
                  onChange={setPlan}
                  options={[
                    { id: "pro", label: "Pro", hint: "30 days" },
                    { id: "elite", label: "Elite", hint: "30 days" },
                  ] as const}
                />
              </FormField>

              <FormField label="Why do you want in?" htmlFor="f-why" required>
                <textarea
                  id="f-why"
                  name="why_joining"
                  required
                  minLength={10}
                  maxLength={1500}
                  rows={4}
                  placeholder="Tell us about your trading journey."
                  className={`${formInputClass()} min-h-[106px] resize-y`}
                />
              </FormField>

              <div>
                <button type="submit" disabled={submitting || remaining === 0} className={SUBMIT_BUTTON}>
                  {submitting ? "Submitting…" : remaining === 0 ? "This month is full" : "Submit application"}
                </button>
                <p className="mt-4 text-[13px] text-gc-ink-muted">
                  By applying you agree to Jenvu's{" "}
                  <Link to="/terms" className="text-foreground underline underline-offset-2">Terms</Link> and{" "}
                  <Link to="/disclaimer" className="text-foreground underline underline-offset-2">Risk Disclaimer</Link>. Trading involves significant risk.
                  {" "}Questions? <a href="mailto:support@jenvu.com" className="text-foreground underline underline-offset-2">support@jenvu.com</a>
                </p>
              </div>
            </form>
          )}
        </div>
      </main>

      <BlogFooter />
    </div>
  );
}

function Field(props: { name: string; label: string; type?: string; required?: boolean; defaultValue?: string; autoComplete?: string }) {
  const id = `f-${props.name}`;
  return (
    <FormField label={props.label} htmlFor={id} required={props.required}>
      <input
        id={id}
        name={props.name}
        type={props.type ?? "text"}
        required={props.required}
        autoComplete={props.autoComplete}
        defaultValue={props.defaultValue}
        className={formInputClass()}
      />
    </FormField>
  );
}
