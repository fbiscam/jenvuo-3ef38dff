import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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



const columns = [
  {
    label: "Why Jenvu",
    links: [
      { to: "/", label: "Home" },
      { to: "/about", label: "About Jenvu" },
      { to: "/founding", label: "Founding Program" },
      { to: "/broadcasts", label: "Broadcast" },
      { to: "/founder", label: "Our Founder" },
    ],
  },
  {
    label: "Production",
    links: [
      { to: "/pricing", label: "Jenvu pricing" },
      { to: "/download", label: "Download App" },
      { to: "/llm", label: "Language Model" },
      { to: "/development", label: "Development" },
      { to: "/ai-engine", label: "Products" },
    ],
  },
  {
    label: "Intelligence",
    links: [
      { to: "/insights", label: "Market Insights" },
      { to: "/scam-tool", label: "Scam Tool" },
      { to: "/scam-check", label: "Scam Check" },
      { to: "/killzones", label: "Killzones" },
      { to: "/strategies/ict-gold-trading", label: "Solutions" },
    ],
  },
  {
    label: "Resources",
    links: [
      { to: "/dashboard", label: "Dashboard" },
      { to: "/auth", label: "Sign In" },
      { to: "/help", label: "Help Center" },
      { to: "/contact", label: "Contact us" },
      { to: "/docs", label: "Documentation" },
    ],
  },
  {
    label: "Legal",
    links: [
      { to: "/terms", label: "Terms of Service" },
      { to: "/privacy", label: "Privacy Policy" },
      { to: "/refund", label: "Refund Policy" },
      { to: "/disclaimer", label: "Risk Disclaimer" },
      { to: "/cancellation", label: "Cancellation Policy" },
    ],
  },
] as const;

export default function SiteFooter({ className }: { className?: string }) {
  const year = new Date().getFullYear();
  return (
    <footer className={`jenvu-site-footer hide-in-pwa relative border-t border-gc-line bg-background ${className || ""}`}>
      <div className="w-full px-6 py-10 sm:px-10 sm:py-12 lg:px-16">
        <div className="jenvu-footer-menu-zoom">
        <div className="grid grid-cols-2 gap-x-8 gap-y-10 md:grid-cols-5">
          {columns.map((col) => (
            <div key={col.label}>
              <h3 className="text-[16px] font-normal text-gc-ink">{col.label}</h3>
              <ul className="mt-5 space-y-[14px]">
                {col.links.map((l) => (
                  <li key={`${l.to}:${l.label}`}>
                    <Link
                      to={l.to}
                      className="text-[14px] text-gc-ink transition-colors hover:text-gc-blue-deep hover:underline"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 flex flex-col gap-5 border-t border-gc-line pt-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-[14px] text-gc-ink">
            <Link to="/about" className="hover:text-gc-blue-deep">About Jenvu</Link>
            <span className="text-gc-ink-muted">|</span>
            <Link to="/privacy" className="hover:text-gc-blue-deep">Privacy</Link>
            <span className="text-gc-ink-muted">|</span>
            <Link to="/terms" className="hover:text-gc-blue-deep">Site terms</Link>
            <span className="text-gc-ink-muted">|</span>
            <Link to="/disclaimer" className="hover:text-gc-blue-deep">Risk Disclaimer</Link>
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
