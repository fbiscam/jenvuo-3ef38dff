import * as React from "react";
import SiteHeader from "@/components/SiteHeader";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { submitContactMessage } from "@/lib/contact.functions";
import { isValidWhatsApp } from "@/lib/contact-phone";
import BlogFooter from "@/components/BlogFooter";
import {
  ArrowUpRight,
  CALLOUT_BUTTON,
  FORM_SANS,
  FormCallout,
  FormField,
  FormHero,
  RadioCards,
  SUBMIT_BUTTON,
  formInputClass,
} from "@/components/forms/CenteredForm";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Partner with us — Jenvu" },
      {
        name: "description",
        content:
          "Partner with Jenvu — collaborate with our desk on integrations, institutional access, media, and support.",
      },
      { property: "og:title", content: "Partner With Us — Jenvu" },
      {
        property: "og:description",
        content: "Partner with Jenvu — collaborate with our desk on integrations, institutional access, media, and support.",
      },
      { property: "og:url", content: "https://jenvu.com/contact" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Partner With Us — Jenvu" },
      { name: "twitter:description", content: "Partner with Jenvu — collaborate with our desk on integrations, access, and support." },

    ],
    links: [{ rel: "canonical", href: "https://jenvu.com/contact" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "ContactPage",
          name: "Contact Jenvu",
          url: "https://jenvu.com/contact",
          mainEntity: {
            "@type": "Organization",
            name: "Jenvu AI",
            email: "support@jenvu.com",
            url: "https://jenvu.com",
          },
        }),
      },
    ],
  }),
  component: ContactPage,
});

const REQUEST_TYPES = [
  { id: "Plans & billing", label: "Plans & billing" },
  { id: "Partnership", label: "Partnership" },
  { id: "Support", label: "Support" },
] as const;
type RequestType = (typeof REQUEST_TYPES)[number]["id"];

const ClientSchema = z.object({
  firstName: z.string().trim().min(1, "Enter your first name").max(50),
  lastName: z.string().trim().min(1, "Enter your last name").max(50),
  email: z.string().trim().email("Enter a valid email").max(255),
  whatsapp: z.string().trim().refine(isValidWhatsApp, "Enter your WhatsApp number with country code"),
  company: z.string().trim().max(80, "Company name is too long"),
  requestType: z.string().min(1, "Choose a request type"),
  message: z.string().trim().min(5, "Message is too short").max(2000),
});

type FormState = {
  firstName: string;
  lastName: string;
  email: string;
  whatsapp: string;
  company: string;
  requestType: RequestType | "";
  message: string;
};

const INITIAL: FormState = { firstName: "", lastName: "", email: "", whatsapp: "", company: "", requestType: "", message: "" };

function ContactPage() {
  const submit = useServerFn(submitContactMessage);
  const [form, setForm] = React.useState<FormState>(INITIAL);
  const [errors, setErrors] = React.useState<Partial<Record<keyof FormState, string>>>({});
  const [busy, setBusy] = React.useState(false);
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [doneEmail, setDoneEmail] = React.useState<string | null>(null);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => {
    setForm((s) => ({ ...s, [k]: v }));
    if (errors[k]) setErrors((es) => ({ ...es, [k]: undefined }));
    if (serverError) setServerError(null);
  };
  const onChange = (k: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    set(k, e.target.value as never);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);
    const parsed = ClientSchema.safeParse(form);
    if (!parsed.success) {
      const fieldErrors: Partial<Record<keyof FormState, string>> = {};
      for (const issue of parsed.error.issues) {
        const path = issue.path[0] as keyof FormState | undefined;
        if (path && !fieldErrors[path]) fieldErrors[path] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }
    const d = parsed.data;
    setBusy(true);
    try {
      const res = await submit({
        data: {
          name: `${d.firstName} ${d.lastName}`.trim(),
          email: d.email,
          phone: d.whatsapp,
          requirePhone: true,
          subject: d.company ? `${d.requestType} — ${d.company}` : d.requestType,
          message: d.message,
        },
      });
      if (res.ok) {
        setDoneEmail(d.email);
        setForm(INITIAL);
      } else {
        setServerError(res.error);
      }
    } catch (err) {
      setServerError(err instanceof Error ? err.message : "Something went wrong. Try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={`public-cloudflare min-h-dvh w-full bg-background text-gc-ink ${FORM_SANS} antialiased`}>
      <SiteHeader />

      <main className="w-full px-5 pb-24 pt-20 sm:pt-28">
        <FormHero eyebrow="Sales" title="Contact Sales">
          Interested in what Jenvu can do for your trading or your team? Fill out the form and a member of our team will be in touch shortly.
        </FormHero>

        <FormCallout
          action={
            <a href="https://dash.jenvu.com/overview" className={CALLOUT_BUTTON}>
              Open Jenvu Dashboard <ArrowUpRight />
            </a>
          }
        >
          Want to get started right away?
          <br />
          You can self-serve directly in the dashboard.
        </FormCallout>

        <div className="mx-auto mt-16 max-w-[605px]">
          {doneEmail ? (
            <div className="rounded-xl bg-gc-surface p-6 text-center" role="status" aria-live="polite">
              <h2 className="text-[22px] font-normal tracking-tight">Message received.</h2>
              <p className="mt-2 text-[15px] text-gc-ink-muted">
                Thanks — we'll reply to <span className="text-foreground">{doneEmail}</span> within one business day.
              </p>
              <button type="button" onClick={() => setDoneEmail(null)} className={`${CALLOUT_BUTTON} mt-5`}>
                Send another message
              </button>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="space-y-7" noValidate>
              <div className="grid grid-cols-1 gap-x-4 gap-y-7 sm:grid-cols-2">
                <FormField label="First Name" htmlFor="c-first" required error={errors.firstName}>
                  <input id="c-first" type="text" autoComplete="given-name" maxLength={50} value={form.firstName} onChange={onChange("firstName")} className={formInputClass(!!errors.firstName)} />
                </FormField>
                <FormField label="Last Name" htmlFor="c-last" required error={errors.lastName}>
                  <input id="c-last" type="text" autoComplete="family-name" maxLength={50} value={form.lastName} onChange={onChange("lastName")} className={formInputClass(!!errors.lastName)} />
                </FormField>
              </div>
              <FormField label="Email" htmlFor="c-email" required error={errors.email}>
                <input id="c-email" type="email" autoComplete="email" maxLength={255} value={form.email} onChange={onChange("email")} className={formInputClass(!!errors.email)} />
              </FormField>
              <FormField label="WhatsApp Number" htmlFor="c-whatsapp" required error={errors.whatsapp}>
                <input id="c-whatsapp" type="tel" inputMode="tel" autoComplete="tel" placeholder="+1 555 123 4567" maxLength={30} value={form.whatsapp} onChange={onChange("whatsapp")} className={formInputClass(!!errors.whatsapp)} />
              </FormField>
              <FormField label="Company Name (optional)" htmlFor="c-company" error={errors.company}>
                <input id="c-company" type="text" autoComplete="organization" maxLength={80} value={form.company} onChange={onChange("company")} className={formInputClass(!!errors.company)} />
              </FormField>
              <FormField label="Request Type" required error={errors.requestType}>
                <RadioCards name="request-type" value={form.requestType} onChange={(v) => set("requestType", v)} options={REQUEST_TYPES} />
              </FormField>
              <FormField label="Message" htmlFor="c-message" required error={errors.message}>
                <textarea id="c-message" rows={4} maxLength={2000} value={form.message} onChange={onChange("message")} className={`${formInputClass(!!errors.message)} min-h-[106px] resize-y`} placeholder="How can we help?" />
              </FormField>

              {serverError && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">{serverError}</div>
              )}

              <div>
                <button type="submit" disabled={busy} className={SUBMIT_BUTTON}>
                  {busy ? "Sending…" : "Contact Sales"}
                </button>
                <p className="mt-4 text-[13px] text-gc-ink-muted">
                  Your details are handled under Jenvu's{" "}
                  <Link to="/privacy" className="text-foreground underline underline-offset-2">Privacy Policy</Link>.
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
