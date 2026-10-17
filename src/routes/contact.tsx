import * as React from "react";
import SiteHeader from "@/components/SiteHeader";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { submitContactMessage } from "@/lib/contact.functions";
import SiteFooter from "@/components/SiteFooter";

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

const SANS = "font-['Google_Sans','Product_Sans','Poppins',system-ui,sans-serif]";

const ClientSchema = z.object({
  name: z.string().trim().min(1, "Enter your name").max(100),
  email: z.string().trim().email("Enter a valid email").max(255),
  subject: z.string().trim().min(1, "Add a subject").max(150),
  message: z.string().trim().min(5, "Message is too short").max(2000),
});

type FormState = {
  name: string;
  email: string;
  subject: string;
  message: string;
};

const INITIAL: FormState = { name: "", email: "", subject: "", message: "" };

function ContactPage() {
  const submit = useServerFn(submitContactMessage);
  const [form, setForm] = React.useState<FormState>(INITIAL);
  const [errors, setErrors] = React.useState<Partial<Record<keyof FormState, string>>>({});
  const [busy, setBusy] = React.useState(false);
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [doneEmail, setDoneEmail] = React.useState<string | null>(null);

  const onChange = (k: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((s) => ({ ...s, [k]: e.target.value }));
    if (errors[k]) setErrors((es) => ({ ...es, [k]: undefined }));
    if (serverError) setServerError(null);
  };

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
    setBusy(true);
    try {
      const res = await submit({ data: parsed.data });
      if (res.ok) {
        setDoneEmail(parsed.data.email);
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
    <div className={`public-cloudflare jenvu-zoom min-h-dvh w-full bg-background text-gc-ink ${SANS} antialiased`}>
      <SiteHeader />

      <main className="grid w-full grid-cols-1 lg:grid-cols-[1fr_minmax(360px,30%)]">
        {/* LEFT — form */}
        <section className="px-5 py-12 sm:px-10 lg:py-14 lg:pl-[12%] lg:pr-16">
          <div className="max-w-[710px]">
            <h1 className="text-[34px] leading-tight tracking-tight sm:text-[44px]">
              Talk to the Jenvu team
            </h1>
            <ul className="mt-6 space-y-3 text-[17px] text-gc-ink-muted">
              {[
                "Ask about plans, billing or the Terminal",
                "Start a conversation about partnerships",
                "Report a bug or share feedback",
              ].map((t) => (
                <li key={t} className="flex items-center gap-4">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="shrink-0 text-gc-success"><polyline points="4 12 10 18 20 6" /></svg>
                  {t}
                </li>
              ))}
            </ul>

            {doneEmail ? (
              <div className="mt-8 rounded-2xl bg-gc-canvas p-6">
                <h2 className="text-xl">Message received.</h2>
                <p className="mt-2 text-gc-ink-muted">
                  Thanks — we'll reply to <span className="font-medium text-gc-ink">{doneEmail}</span> within one business day.
                </p>
                <button type="button" onClick={() => setDoneEmail(null)} className="mt-5 text-sm font-medium text-gc-blue-deep hover:underline">
                  Send another message
                </button>
              </div>
            ) : (
              <form onSubmit={onSubmit} className="mt-8 space-y-6" noValidate>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field label="Full name*" htmlFor="c-name" error={errors.name}>
                    <input id="c-name" type="text" autoComplete="name" maxLength={100} value={form.name} onChange={onChange("name")} className={inputClass(!!errors.name)} placeholder="Full name*" />
                  </Field>
                  <Field label="Email*" htmlFor="c-email" error={errors.email}>
                    <input id="c-email" type="email" autoComplete="email" maxLength={255} value={form.email} onChange={onChange("email")} className={inputClass(!!errors.email)} placeholder="Email*" />
                  </Field>
                </div>
                <Field label="Subject*" htmlFor="c-subject" error={errors.subject}>
                  <input id="c-subject" type="text" maxLength={150} value={form.subject} onChange={onChange("subject")} className={inputClass(!!errors.subject)} placeholder="Subject*" />
                </Field>
                <div>
                  <label htmlFor="c-message" className="text-[15px] text-gc-ink-muted">Describe what you need*</label>
                  <textarea id="c-message" rows={4} maxLength={2000} value={form.message} onChange={onChange("message")} className={`${inputClass(!!errors.message)} mt-1.5 min-h-[104px] resize-y`} placeholder="e.g., I'd like to know more about the Elite plan." />
                  <div className="mt-1 flex justify-between text-xs text-gc-ink-muted">
                    <span className="text-destructive">{errors.message}</span>
                    <span>{form.message.length}/2,000</span>
                  </div>
                </div>

                {serverError && (
                  <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">{serverError}</div>
                )}

                <button type="submit" disabled={busy} className="rounded-full bg-home-accent px-6 py-3.5 text-[17px] font-medium text-home-accent-foreground hover:opacity-90 disabled:opacity-60">
                  {busy ? "Sending…" : "Submit request"}
                </button>
                <p className="text-[16px] text-gc-ink-muted">
                  I understand my personal data will be processed in accordance with Jenvu's{" "}
                  <Link to="/privacy" className="text-gc-blue-deep underline">Privacy Policy</Link>.
                </p>
              </form>
            )}
          </div>
        </section>

        {/* RIGHT — cards */}
        <aside className="bg-gc-canvas px-5 py-10 sm:px-10 lg:py-14">
          <div className="max-w-[370px] space-y-4">
            <div className="rounded-xl border border-gc-line bg-background p-6">
              <img src="/favicon.png" alt="Jenvu" className="h-10 w-10 rounded-lg object-contain" />
              <h2 className="mt-4 text-[20px]">Contact our team directly</h2>
              <a href="mailto:support@jenvu.com" className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-home-accent px-5 py-3 text-[16px] font-medium text-home-accent-foreground hover:opacity-90">
                Email support@jenvu.com
              </a>
              <p className="mt-4 text-[15px] text-gc-ink-muted">Available Monday to Friday, 09:00 – 18:00 GMT</p>
            </div>
            <SideCard text="New customers get $100 credit and 14 days of Pro." link="Get started for free" href="https://auth.jenvu.com/sign-in" />
            <SideCard text="Get help with your account, resolve billing issues, and find helpful guides." link="Visit Jenvu Support" href="https://support.jenvu.com" />
            <SideCard text="Learn how the Founding Program gives early traders access." link="Apply to the Founding Program" href="https://jenvu.com/founding" />
          </div>
        </aside>
      </main>

      <SiteFooter />
    </div>
  );
}

function SideCard({ text, link, href }: { text: string; link: string; href: string }) {
  return (
    <div className="rounded-xl border border-gc-line bg-background p-4">
      <p className="text-[15px] leading-relaxed">{text}</p>
      <a href={href} className="mt-4 inline-block text-[15px] font-medium text-gc-blue-deep hover:underline">{link}</a>
    </div>
  );
}

function Field({ label, htmlFor, error, children }: { label: string; htmlFor: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="sr-only">{label}</label>
      {children}
      {error && <p className="mt-1.5 text-xs text-destructive">{error}</p>}
    </div>
  );
}

function inputClass(hasError: boolean) {
  return [
    "w-full rounded-[4px] border bg-background px-4 py-4 text-[16px] text-gc-ink placeholder:text-gc-ink-muted",
    "outline-none transition focus:border-gc-blue-deep focus:ring-1 focus:ring-gc-blue-deep",
    hasError ? "border-destructive" : "border-gc-ink-muted/50",
  ].join(" ");
}
