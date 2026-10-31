/**
 * One light/black theme choice for the whole site.
 * Public pages get `.dark` on <html>; the dashboard applies its own wrapper
 * class (it reads the same choice), so <html> stays light under /dashboard.
 */
export type SiteTheme = "light" | "dark";

export const SITE_THEME_KEY = "jenvu:theme";
const DASH_KEY = "jenvu:dash:theme";
const COOKIE = "jenvu_theme";
export const SITE_THEME_EVENT = "jenvu:theme-change";

/** Paths (internal router paths) where <html> must not carry `.dark`. */
export function themeSkipsHtml(pathname: string): boolean {
  return pathname.startsWith("/dashboard");
}

export function readSiteTheme(): SiteTheme | null {
  if (typeof window === "undefined") return null;
  try {
    const m = document.cookie.match(/(?:^|;\s*)jenvu_theme=(light|dark)/);
    if (m) return m[1] as SiteTheme;
    const v = window.localStorage.getItem(SITE_THEME_KEY);
    return v === "light" || v === "dark" ? v : null;
  } catch {
    return null;
  }
}

export function applyHtmlTheme(pathname: string) {
  if (typeof document === "undefined") return;
  const dark = readSiteTheme() === "dark" && !themeSkipsHtml(pathname);
  document.documentElement.classList.toggle("dark", dark);
  document.documentElement.style.colorScheme = dark ? "dark" : "light";
}

export function saveSiteTheme(theme: SiteTheme) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(SITE_THEME_KEY, theme);
    window.localStorage.setItem(DASH_KEY, theme);
    const host = window.location.hostname;
    const domain = host.endsWith("jenvu.com") ? "; domain=.jenvu.com" : "";
    document.cookie = `${COOKIE}=${theme}; path=/; max-age=31536000; SameSite=Lax${domain}`;
  } catch {
    /* storage blocked */
  }
  window.dispatchEvent(new CustomEvent(SITE_THEME_EVENT, { detail: theme }));
}

/** Runs before React paints so a black-theme visitor never sees a white flash. */
export const SITE_THEME_BOOT_SCRIPT = `(function(){try{var m=document.cookie.match(/(?:^|;\\s*)jenvu_theme=(light|dark)/);var t=m?m[1]:localStorage.getItem("${SITE_THEME_KEY}");var h=location.hostname;var p=location.pathname;var dash=h.indexOf("dash.")===0||p.indexOf("/dashboard")===0;if(t==="dark"&&!dash){document.documentElement.classList.add("dark");document.documentElement.style.colorScheme="dark";}}catch(e){}})();`;
