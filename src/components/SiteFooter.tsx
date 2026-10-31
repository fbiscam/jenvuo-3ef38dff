import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Globe } from "lucide-react";

const MONO = "font-mono";

function NewsletterSubscribe() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const target = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(target)) {
      toast.error("Please enter a valid email.");
      return;
    }
    setLoading(true);
    const { error } = await supabase
      .from("newsletter_subscribers")
      .insert({ email: target });
    setLoading(false);
    if (error && !/duplicate|unique/i.test(error.message)) {
      toast.error("Could not subscribe. Try again.");
      return;
    }
    setDone(true);
    setEmail("");
    toast.success("Subscribed — thank you!");
  };

  return (
    <form onSubmit={onSubmit} className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
      <span className="text-[14px] text-gc-ink">Sign up for the Jenvu newsletter</span>
      <div className="flex items-center gap-2">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          maxLength={255}
          aria-label="Email address"
          className="h-10 w-48 rounded-full border border-gc-line bg-background px-4 text-[13px] text-gc-ink placeholder:text-gc-ink-muted outline-none focus:border-gc-blue-deep"
        />
        <button
          type="submit"
          disabled={loading || done}
          className="h-10 rounded-full bg-gc-blue-deep px-6 text-[14px] font-medium text-gc-on-blue hover:bg-gc-navy disabled:opacity-60"
        >
          {done ? "Subscribed" : loading ? "…" : "Subscribe"}
        </button>
      </div>
    </form>
  );
}



type FooterLink = { to: string; label: string; ext?: boolean };
type FooterGroup = { label: string; links: FooterLink[] };

/* OpenAI Business-style footer: five columns, each with one or more titled groups. */
const columns: FooterGroup[][] = [
  [
    { label: "Intelligence", links: [
      { to: "/ai-engine", label: "AI Engine" },
      { to: "/insights", label: "Market Insights" },
      { to: "/killzones", label: "Killzones" },
      { to: "/llm", label: "Language Model" },
    ] },
    { label: "Latest models", links: [
      { to: "/models", label: "All models" },
      { to: "/models", label: "GPT-5.5" },
      { to: "/models", label: "Claude Opus 5" },
      { to: "/models", label: "DeepSeek V4" },
    ] },
    { label: "Safety", links: [
      { to: "/disclaimer", label: "Risk Disclaimer" },
      { to: "/scam-tool", label: "Scam Tool" },
    ] },
  ],
  [
    { label: "Products", links: [
      { to: "/dashboard/terminal", label: "Fiber Terminal", ext: true },
      { to: "/download", label: "Download App", ext: true },
      { to: "/development", label: "Development" },
      { to: "/strategies/ict-gold-trading", label: "Solutions" },
    ] },
    { label: "API Platform", links: [
      { to: "/platform", label: "Platform Overview" },
      { to: "/dashboard/api", label: "API Log In", ext: true },
      { to: "/docs", label: "Developer Docs", ext: true },
    ] },
  ],
  [
    { label: "Business", links: [
      { to: "/about", label: "Overview" },
      { to: "/pricing", label: "Pricing" },
      { to: "/founding", label: "Founding Program" },
      { to: "/contact", label: "Contact Sales" },
    ] },
    { label: "Developers", links: [
      { to: "/models", label: "Models", ext: true },
      { to: "/docs", label: "API Docs", ext: true },
      { to: "/dashboard/usage", label: "Usage", ext: true },
    ] },
  ],
  [
    { label: "Company", links: [
      { to: "/about", label: "About Us" },
      { to: "/founder", label: "Our Founder" },
      { to: "/broadcasts", label: "Broadcast" },
    ] },
    { label: "Support", links: [
      { to: "/help", label: "Help Center", ext: true },
      { to: "/contact", label: "Contact Support" },
      { to: "/auth", label: "Sign In" },
    ] },
  ],
  [
    { label: "More", links: [
      { to: "/insights", label: "Blog" },
      { to: "/search", label: "Search" },
      { to: "/dashboard", label: "Dashboard" },
    ] },
    { label: "Terms & policies", links: [
      { to: "/terms", label: "Terms of Use" },
      { to: "/privacy", label: "Privacy Policy" },
      { to: "/refund", label: "Refund Policy" },
      { to: "/cancellation", label: "Cancellation Policy" },
    ] },
  ],
];

export default function SiteFooter({ className }: { className?: string }) {
  const year = new Date().getFullYear();
  return (
    <footer className={`jenvu-site-footer hide-in-pwa relative border-t border-gc-line bg-background ${className || ""}`}>
      <div className="w-full px-6 py-10 sm:px-10 sm:py-12 lg:px-16">
        <div className="jenvu-footer-menu-zoom">
        <div className="grid grid-cols-2 gap-x-8 gap-y-10 md:grid-cols-5">
          {columns.map((groups, ci) => (
            <div key={ci} className="space-y-10">
              {groups.map((g) => (
                <div key={g.label}>
                  <h3 className="text-[14px] font-medium text-muted-foreground">{g.label}</h3>
                  <ul className="mt-4 space-y-3">
                    {g.links.map((l) => (
                      <li key={`${l.to}:${l.label}`}>
                        <Link to={l.to} className="text-[14px] text-foreground transition-opacity hover:opacity-60">
                          {l.label}
                          {l.ext && <span className="ml-1 text-[11px] text-muted-foreground">↗</span>}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          ))}
        </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 flex flex-col gap-5 border-t border-gc-line pt-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[14px] text-muted-foreground">
            <span>Jenvu © {year}</span>
            <Link to="/privacy" className="hover:text-foreground">Privacy</Link>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-gc-line px-3 py-1.5 text-foreground">
              <Globe className="h-4 w-4" aria-hidden /> English (United States)
            </span>
          </div>


          <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center">
            <div className="flex items-center gap-2">
              {[
                {
                  href: "https://x.com/jenvu",
                  label: "X (Twitter)",
                  icon: (
                    <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4" aria-hidden="true">
                      <path d="M18.244 2H21l-6.52 7.45L22 22h-6.797l-4.77-6.24L4.8 22H2l7.03-8.03L2 2h6.914l4.31 5.71L18.244 2Zm-1.19 18h1.62L7.03 4h-1.7l11.724 16Z" />
                    </svg>
                  ),
                },
                {
                  href: "https://www.instagram.com/jenvucompany/",
                  label: "Instagram",
                  icon: (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
                      <rect x="3" y="3" width="18" height="18" rx="5" />
                      <circle cx="12" cy="12" r="4" />
                      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
                    </svg>
                  ),
                },
                {
                  href: "https://www.facebook.com/jenvucompany",
                  label: "Facebook",
                  icon: (
                    <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4" aria-hidden="true">
                      <path d="M22 12a10 10 0 1 0-11.563 9.877v-6.988H7.898V12h2.539V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.889h-2.33v6.988A10.002 10.002 0 0 0 22 12Z" />
                    </svg>
                  ),
                },
                {
                  href: "https://whatsapp.com/channel/jenvuai",
                  label: "WhatsApp",
                  icon: (
                    <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4" aria-hidden="true">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.296-.767.966-.94 1.164-.173.198-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.019-.458.13-.606.134-.133.297-.347.446-.52.149-.174.198-.298.297-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.71.306 1.263.489 1.695.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347Zm-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.892 6.994c-.003 5.45-4.437 9.884-9.884 9.884Zm8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
                    </svg>
                  ),
                },
              ].map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={s.label}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-gc-line bg-background text-gc-ink-muted transition-colors hover:text-gc-blue-deep"
                >
                  {s.icon}
                </a>
              ))}
            </div>

            <NewsletterSubscribe />
          </div>
        </div>
      </div>
    </footer>
  );
}
