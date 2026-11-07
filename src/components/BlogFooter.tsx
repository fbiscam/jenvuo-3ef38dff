import JenvuMark from "@/components/JenvuMark";
import { Link } from "@tanstack/react-router";
import { HelpCircle } from "lucide-react";

const SOCIAL = [
  { href: "https://x.com/jenvu", label: "X", d: "M18.244 2H21l-6.52 7.45L22 22h-6.797l-4.77-6.24L4.8 22H2l7.03-8.03L2 2h6.914l4.31 5.71L18.244 2Zm-1.19 18h1.62L7.03 4h-1.7l11.724 16Z" },
  { href: "https://www.youtube.com/@jenvu", label: "YouTube", d: "M23 7.2a3 3 0 0 0-2.1-2.1C19 4.6 12 4.6 12 4.6s-7 0-8.9.5A3 3 0 0 0 1 7.2 31 31 0 0 0 .5 12 31 31 0 0 0 1 16.8a3 3 0 0 0 2.1 2.1c1.9.5 8.9.5 8.9.5s7 0 8.9-.5a3 3 0 0 0 2.1-2.1 31 31 0 0 0 .5-4.8 31 31 0 0 0-.5-4.8ZM9.75 15.02V8.98L15.5 12l-5.75 3.02Z" },
  { href: "https://www.linkedin.com/company/jenvu", label: "LinkedIn", d: "M20.45 2H3.55A1.55 1.55 0 0 0 2 3.55v16.9C2 21.3 2.7 22 3.55 22h16.9c.85 0 1.55-.7 1.55-1.55V3.55C22 2.7 21.3 2 20.45 2ZM8 19H5V9.5h3V19ZM6.5 8.2a1.75 1.75 0 1 1 0-3.5 1.75 1.75 0 0 1 0 3.5ZM19 19h-3v-4.6c0-1.1 0-2.5-1.5-2.5S12.8 13 12.8 14.3V19h-3V9.5h2.9v1.3h.04c.4-.76 1.38-1.56 2.84-1.56 3.04 0 3.42 2 3.42 4.6V19Z" },
  { href: "https://www.facebook.com/jenvucompany/", label: "Facebook", d: "M20 2H4a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h8.6v-7h-2.4v-2.8h2.4V10c0-2.4 1.5-3.7 3.6-3.7l2.2.1v2.5h-1.5c-1.2 0-1.4.6-1.4 1.4v1.9h2.8l-.4 2.8h-2.4v7H20a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2Z" },
  { href: "https://whatsapp.com/channel/0029VbB4UDs3bbV9jWIhxN3T", label: "WhatsApp", d: "M12.04 2a9.9 9.9 0 0 0-8.5 15l-1.5 5 5.2-1.4A9.9 9.9 0 1 0 12.04 2Zm0 18.1a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3.1.8.8-3-.2-.3a8.2 8.2 0 1 1 7 3.9Zm4.5-6.1c-.25-.12-1.46-.72-1.69-.8-.23-.08-.39-.12-.56.12-.16.25-.64.8-.78.97-.14.16-.29.18-.54.06-.25-.12-1.04-.38-1.98-1.22-.73-.65-1.23-1.46-1.37-1.7-.14-.25-.02-.38.11-.5.11-.11.25-.29.37-.43.12-.15.16-.25.25-.41.08-.17.04-.31-.02-.43-.06-.13-.56-1.35-.77-1.85-.2-.48-.41-.42-.56-.42h-.48c-.17 0-.43.06-.66.31-.23.25-.87.85-.87 2.07s.89 2.4 1.01 2.57c.12.16 1.75 2.67 4.24 3.75.59.26 1.05.41 1.41.52.6.19 1.13.16 1.56.1.48-.07 1.46-.6 1.67-1.18.2-.58.2-1.07.14-1.18-.06-.1-.22-.16-.47-.29Z" },
];

/** Simple Google Cloud blog-style footer used on the blog pages. */
export default function BlogFooter() {
  return (
    <footer className="hide-in-pwa border-t border-gc-line bg-background">
      <div className="site-edge py-8 sm:py-10">
        <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
          <span className="text-[15px] font-medium text-gc-ink">Follow us</span>
          <div className="flex items-center gap-6 sm:gap-8">
            {SOCIAL.map((s) => (
              <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer" aria-label={s.label} className="text-gc-ink transition-colors hover:text-gc-blue">
                <svg viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6" aria-hidden="true"><path d={s.d} /></svg>
              </a>
            ))}
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-5 border-t border-gc-line pt-8 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
            <JenvuMark className="h-9 w-9 shrink-0 text-foreground" />
            <Link to="/" className="text-[15px] text-gc-ink-muted hover:text-gc-ink">Jenvu</Link>
            <Link to="/pricing" className="text-[15px] text-gc-ink-muted hover:text-gc-ink">Jenvu Products</Link>
            <Link to="/privacy" className="text-[15px] text-gc-ink-muted hover:text-gc-ink">Privacy</Link>
            <Link to="/terms" className="text-[15px] text-gc-ink-muted hover:text-gc-ink">Terms</Link>
          </div>
          <div className="flex items-center gap-6">
            <a href="https://support.jenvu.com" className="flex items-center gap-2 text-[15px] text-gc-ink-muted hover:text-gc-ink">
              <HelpCircle className="h-5 w-5" /> Help
            </a>
            <select aria-label="Language" defaultValue="en" className="w-44 border-0 border-b border-gc-line bg-transparent py-1 text-[15px] text-gc-ink-muted outline-none">
              <option value="en">English</option>
            </select>
          </div>
        </div>
      </div>
    </footer>
  );
}
