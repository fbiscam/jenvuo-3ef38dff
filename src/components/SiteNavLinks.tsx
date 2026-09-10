import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Menu, X } from "lucide-react";

/** Canonical top-navigation links, shared by every public page. */
export const SITE_NAV_LINKS = [
  { to: "/pricing", label: "Pricing" },
  { to: "/insights", label: "Insights" },
  { to: "/help", label: "Help" },
  { to: "/download", label: "Downloads" },
  { to: "/contact", label: "Contact" },
] as const;

export default function SiteNavLinks({ active }: { active?: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <nav className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-7 text-sm text-foreground md:flex">
        {SITE_NAV_LINKS.map((l) => (
          <Link
            key={l.to}
            to={l.to}
            className={
              active === l.to
                ? "font-medium text-home-accent"
                : "text-muted-foreground transition-colors hover:text-home-accent"
            }
          >
            {l.label}
          </Link>
        ))}
      </nav>

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-border text-foreground md:hidden"
      >
        {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full z-50 border-b border-border bg-background px-5 py-3 shadow-sm md:hidden">
          <div className="flex flex-col">
            {SITE_NAV_LINKS.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                onClick={() => setOpen(false)}
                className={
                  "min-h-11 py-2 text-sm " +
                  (active === l.to
                    ? "font-medium text-home-accent"
                    : "text-muted-foreground")
                }
              >
                {l.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
