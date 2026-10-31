import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { useRouterState } from "@tanstack/react-router";
import { applyHtmlTheme, readSiteTheme, saveSiteTheme, SITE_THEME_EVENT, type SiteTheme } from "@/lib/site-theme";

/** Sun / Moon switch: flips the whole site between the white and black look. */
export function ThemeToggle({ className = "" }: { className?: string }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [theme, setTheme] = useState<SiteTheme>("light");

  useEffect(() => {
    setTheme(readSiteTheme() ?? "light");
    const on = (e: Event) => setTheme((e as CustomEvent<SiteTheme>).detail);
    window.addEventListener(SITE_THEME_EVENT, on);
    return () => window.removeEventListener(SITE_THEME_EVENT, on);
  }, []);

  const flip = () => {
    const next: SiteTheme = theme === "dark" ? "light" : "dark";
    saveSiteTheme(next);
    applyHtmlTheme(pathname);
    setTheme(next);
  };

  const dark = theme === "dark";
  return (
    <button
      type="button"
      onClick={flip}
      aria-label={dark ? "Switch to white theme" : "Switch to black theme"}
      title={dark ? "White theme" : "Black theme"}
      className={`inline-flex h-8 w-8 items-center justify-center rounded-full border border-border text-foreground transition-colors hover:bg-muted ${className}`}
    >
      {dark ? <Sun className="h-4 w-4" aria-hidden /> : <Moon className="h-4 w-4" aria-hidden />}
    </button>
  );
}
