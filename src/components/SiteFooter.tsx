import { Link } from "@tanstack/react-router";
import JenvuMark from "@/components/JenvuMark";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Globe } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";


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
    <form onSubmit={onSubmit} className="flex w-full flex-col gap-2.5">
      <span className="text-[13px] text-muted-foreground">Get Jenvu updates by email</span>
      <div className="flex items-center gap-2">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          maxLength={255}
          aria-label="Email address"
          className="h-9 min-w-0 flex-1 rounded-full border border-gc-line bg-background px-4 text-[13px] text-gc-ink placeholder:text-gc-ink-muted outline-none focus:border-gc-blue-deep"
        />
        <button
          type="submit"
          disabled={loading || done}
          className="h-9 rounded-full bg-foreground px-4 text-[13px] font-medium text-background hover:opacity-85 disabled:opacity-60"
        >
          {done ? "Subscribed" : loading ? "…" : "Subscribe"}
        </button>
      </div>
    </form>
  );
}



type FooterLink = { to: string; label: string; ext?: boolean; href?: string };
type FooterGroup = { label: string; links: FooterLink[] };

const SOCIAL = {
  x: "https://x.com/jenvu",
  instagram: "https://www.instagram.com/jenvucompany/",
  facebook: "https://www.facebook.com/jenvucompany",
  whatsapp: "https://whatsapp.com/channel/jenvuai",
};

/* xAI-style footer: brand block on the left, five two-tier link columns on the right. */
const columns: FooterGroup[][] = [
  [
    { label: "Products", links: [
      { to: "/ai-engine", label: "Ask Jenvu" },
      { to: "/dashboard/terminal", label: "Jenvu Terminal" },
      { to: "/jx-bot", label: "JX Bot" },
      { to: "/dashboard/notifications", label: "Alerts" },
      { to: "/models", label: "Models" },
    ] },
    { label: "Download", links: [
      { to: "/download", label: "Jenvu App" },
      { to: "/dashboard/extension", label: "Browser Extension" },
      { to: "/dashboard", label: "Dashboard" },
    ] },
  ],
  [
    { label: "Solutions", links: [
      { to: "/strategies/ict-gold-trading", label: "ICT Gold Trading" },
      { to: "/killzones", label: "Killzones" },
      { to: "/development", label: "Development" },
      { to: "/founding", label: "Founding Program" },
    ] },
    { label: "Resources", links: [
      { to: "/insights", label: "Blog" },
      { to: "/broadcasts", label: "Broadcasts" },
      { to: "/scam-check", label: "Scam Check" },
    ] },
  ],
  [
    { label: "Developers", links: [
      { to: "/platform", label: "API Platform" },
      { to: "/docs", label: "API Docs" },
      { to: "/models", label: "Models" },
      { to: "/dashboard/api", label: "API Keys" },
      { to: "/dashboard/usage", label: "Usage" },
    ] },
    { label: "Business", links: [
      { to: "/pricing", label: "Pricing" },
      { to: "/contact", label: "Contact Sales" },
    ] },
  ],
  [
    { label: "Company", links: [
      { to: "/about", label: "About" },
      { to: "/founder", label: "Founder" },
      { to: "/contact", label: "Contact" },
    ] },
    { label: "Trust", links: [
      { to: "/help", label: "Help Center" },
      { to: "/disclaimer", label: "Risk Disclaimer" },
      { to: "/auth", label: "Sign In" },
    ] },
  ],
  [
    { label: "Legal", links: [
      { to: "/terms", label: "Terms of Use" },
      { to: "/privacy", label: "Privacy Policy" },
      { to: "/refund", label: "Refund Policy" },
      { to: "/cancellation", label: "Cancellation Policy" },
    ] },
    { label: "Social", links: [
      { to: "", href: SOCIAL.x, label: "X" },
      { to: "", href: SOCIAL.instagram, label: "Instagram" },
      { to: "", href: SOCIAL.facebook, label: "Facebook" },
      { to: "", href: SOCIAL.whatsapp, label: "WhatsApp" },
    ] },
  ],
];

const linkCls = "text-[14px] text-muted-foreground transition-colors hover:text-foreground";

export default function SiteFooter({ className }: { className?: string }) {
  const year = new Date().getFullYear();
  return (
    <footer className={`jenvu-site-footer hide-in-pwa relative bg-background ${className || ""}`}>
      {/* Top line sits inside the page width (inset left/right), like the xAI footer. */}
      <div className="site-edge">
        <div className="flex flex-col gap-12 border-t border-gc-line py-12 lg:flex-row lg:gap-0">
          {/* Brand block */}
          <div className="flex shrink-0 flex-col justify-between gap-8 lg:w-[300px] lg:pr-10">
            <div>
              <Link to="/" className="inline-flex items-center gap-2.5 text-[26px] font-medium leading-none tracking-tight text-foreground"><JenvuMark className="h-7 w-7 shrink-0" />Jenvu</Link>
              <p className="mt-4 text-[13px] text-muted-foreground">© {year} Jenvu. All rights reserved.</p>
            </div>
            <div className="space-y-5">
              <NewsletterSubscribe />
              <div className="flex flex-nowrap items-center gap-2">
                <ThemeToggle />
                {/* Theme button, "Built with Jenvu" and "English" always sit on one line. */}
                  <Link to="/platform" className="inline-flex items-center whitespace-nowrap rounded-full border border-border px-4 py-1.5 text-[13px] font-medium text-foreground transition-colors hover:bg-muted">
                    Built with Jenvu
                  </Link>
                  <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-border px-3 py-1.5 text-[13px] text-muted-foreground">
                    <Globe className="h-3.5 w-3.5" aria-hidden /> English
                  </span>
              </div>
            </div>
          </div>

          {/* Link columns: two rows so every title in a row sits on the same line */}
          {/* Pushed to the right so the last column ends on the page's right edge. */}
          <div className="flex flex-1 lg:ml-auto lg:flex-none lg:pl-12">
            <div className="grid flex-1 grid-cols-2 gap-x-8 gap-y-10 sm:grid-cols-3 lg:grid-cols-[repeat(5,max-content)] lg:gap-x-14">
            {[0, 1].map((row) => (
              <div key={row} className="contents">
                {columns.map((groups) => {
                  const g = groups[row];
                  if (!g) return null;
                  return (
                    <div key={g.label}>
                      <h3 className="text-[14px] font-medium text-foreground">{g.label}</h3>
                      <ul className="mt-4 space-y-2.5">
                        {g.links.map((l) => (
                          <li key={`${l.href ?? l.to}:${l.label}`}>
                            {l.href ? (
                              <a href={l.href} target="_blank" rel="noopener noreferrer" className={linkCls}>{l.label}</a>
                            ) : (
                              <Link to={l.to} className={linkCls}>{l.label}</Link>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
