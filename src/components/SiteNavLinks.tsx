import { Link } from "@tanstack/react-router";

/** Canonical top-navigation links, shared by every public page. */
export const SITE_NAV_LINKS = [
  { to: "/signals-live", label: "Live Signals" },
  { to: "/signals-live", label: "Signals Live" },
  { to: "/pricing", label: "Pricing" },
  { to: "/insights", label: "Insights" },
  { to: "/contact", label: "Contact" },
] as const;

export default function SiteNavLinks({ active }: { active?: string }) {
  return (
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
  );
}
