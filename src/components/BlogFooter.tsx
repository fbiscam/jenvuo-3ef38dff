import { Link } from "@tanstack/react-router";
import { HelpCircle } from "lucide-react";

const SOCIAL = [
  { href: "https://x.com/jenvu", label: "X", d: "M18.244 2H21l-6.52 7.45L22 22h-6.797l-4.77-6.24L4.8 22H2l7.03-8.03L2 2h6.914l4.31 5.71L18.244 2Zm-1.19 18h1.62L7.03 4h-1.7l11.724 16Z" },
  { href: "https://www.youtube.com/@jenvu", label: "YouTube", d: "M23 7.2a3 3 0 0 0-2.1-2.1C19 4.6 12 4.6 12 4.6s-7 0-8.9.5A3 3 0 0 0 1 7.2 31 31 0 0 0 .5 12 31 31 0 0 0 1 16.8a3 3 0 0 0 2.1 2.1c1.9.5 8.9.5 8.9.5s7 0 8.9-.5a3 3 0 0 0 2.1-2.1 31 31 0 0 0 .5-4.8 31 31 0 0 0-.5-4.8ZM9.75 15.02V8.98L15.5 12l-5.75 3.02Z" },
  { href: "https://www.linkedin.com/company/jenvu", label: "LinkedIn", d: "M20.45 2H3.55A1.55 1.55 0 0 0 2 3.55v16.9C2 21.3 2.7 22 3.55 22h16.9c.85 0 1.55-.7 1.55-1.55V3.55C22 2.7 21.3 2 20.45 2ZM8 19H5V9.5h3V19ZM6.5 8.2a1.75 1.75 0 1 1 0-3.5 1.75 1.75 0 0 1 0 3.5ZM19 19h-3v-4.6c0-1.1 0-2.5-1.5-2.5S12.8 13 12.8 14.3V19h-3V9.5h2.9v1.3h.04c.4-.76 1.38-1.56 2.84-1.56 3.04 0 3.42 2 3.42 4.6V19Z" },
  { href: "https://www.instagram.com/jenvucompany/", label: "Instagram", d: "M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10Zm0 8.2a3.2 3.2 0 1 1 0-6.4 3.2 3.2 0 0 1 0 6.4ZM17.3 5.5a1.2 1.2 0 1 0 0 2.4 1.2 1.2 0 0 0 0-2.4ZM7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5Zm0 1.8A3.2 3.2 0 0 0 3.8 7v10A3.2 3.2 0 0 0 7 20.2h10a3.2 3.2 0 0 0 3.2-3.2V7A3.2 3.2 0 0 0 17 3.8H7Z" },
  { href: "https://www.facebook.com/jenvucompany", label: "Facebook", d: "M20 2H4a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h8.6v-7h-2.4v-2.8h2.4V10c0-2.4 1.5-3.7 3.6-3.7l2.2.1v2.5h-1.5c-1.2 0-1.4.6-1.4 1.4v1.9h2.8l-.4 2.8h-2.4v7H20a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2Z" },
];

/** Simple Google Cloud blog-style footer used on the blog pages. */
export default function BlogFooter() {
  return (
    <footer className="hide-in-pwa border-t border-gc-line bg-background">
      <div className="mx-auto max-w-[1300px] px-5 py-8 sm:px-10 sm:py-10">
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
            <img src="/favicon.png" alt="Jenvu" width={36} height={36} className="h-9 w-9 shrink-0" />
            <a href="https://jenvu.com/" className="text-[15px] text-gc-ink-muted hover:text-gc-ink">Jenvu</a>
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
