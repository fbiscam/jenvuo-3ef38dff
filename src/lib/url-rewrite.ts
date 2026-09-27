/**
 * URL rewriting for the apex domain (jenvu.com).
 *
 * Goals:
 *  - Stop the subdomain mounting scene (dash./leads./blogs./support.jenvu.com).
 *  - Keep the internal route tree at /dashboard/* for the trading dashboard.
 *  - Expose clean public URLs on the apex domain:
 *      jenvu.com/alerts           -> /dashboard/alerts
 *      jenvu.com/billing          -> /dashboard/billing
 *      jenvu.com/admin/accuracy   -> /dashboard/admin/accuracy
 *      jenvu.com/dashboard        -> /dashboard (overview, no rewrite)
 *      jenvu.com/leads/*          -> /leads/* (no rewrite, just the normal route)
 *
 * On the server, `apexRedirectTarget` sends subdomain traffic and legacy
 * /dashboard/child paths to the new apex URL, then the router rewrite maps
 * the apex URL to the internal route tree.
 */

const ROOT_DOMAIN = "jenvu.com";
const AUTH_HOST = `auth.${ROOT_DOMAIN}`;

const SUBDOMAIN_SECTIONS: Record<string, string> = {
  leads: "/leads",
  dash: "/dashboard",
  blogs: "/insights",
  support: "/help",
};

// Top-level dashboard children that should be exposed at the root.
const DASHBOARD_CHILDREN = new Set([
  "alerts",
  "analytics",
  "billing",
  "documents",
  "api",
  "journal",
  "pay",
  "terminal",
  "notifications",
  "profile",
  "referrals",
  "risk",
  "security",
  "usage",
  "workspace",
]);

/** Paths that must never be rewritten or redirected (server endpoints, assets, RPC). */
function isReserved(pathname: string): boolean {
  return (
    pathname.startsWith("/api/") ||
    pathname.startsWith("/lovable/") ||
    pathname.startsWith("/email/") ||
    pathname.startsWith("/_serverFn") ||
    pathname.startsWith("/_build/") ||
    pathname.startsWith("/assets/") ||
    pathname.startsWith("/@") ||
    /\.[a-z0-9]{2,5}$/i.test(pathname)
  );
}

function isApex(host: string): boolean {
  return host === ROOT_DOMAIN || host === `www.${ROOT_DOMAIN}`;
}

// The trading dashboard is hosted directly on the dash subdomain.
function isDash(host: string): boolean {
  return host === `dash.${ROOT_DOMAIN}`;
}

// Subdomains that host a section directly:
//   blogs.jenvu.com   -> /insights (blog)
//   leads.jenvu.com   -> /leads
//   support.jenvu.com -> /help (help centre)
const SECTION_HOSTS: Record<string, string> = {
  [`blogs.${ROOT_DOMAIN}`]: "/insights",
  [`leads.${ROOT_DOMAIN}`]: "/leads",
  [`support.${ROOT_DOMAIN}`]: "/help",
};

// Internal path prefix -> the subdomain that hosts it. Used to send users to
// the right host when they navigate across sections (e.g. dashboard -> help).
const PATH_HOSTS: Array<[prefix: string, host: string]> = [
  ["/dashboard", `dash.${ROOT_DOMAIN}`],
  ["/help", `support.${ROOT_DOMAIN}`],
  ["/leads", `leads.${ROOT_DOMAIN}`],
  ["/insights", `blogs.${ROOT_DOMAIN}`],
];

/** Host that should serve this internal path, or null if it stays put. */
function hostForPath(pathname: string): { host: string; prefix: string } | null {
  for (const [prefix, host] of PATH_HOSTS) {
    if (pathname === prefix || pathname.startsWith(`${prefix}/`)) {
      return { host, prefix };
    }
  }
  return null;
}

/** True for every host we manage (apex, www, dash, section subdomains). */
function isManagedHost(host: string): boolean {
  return isApex(host) || isDash(host) || host === AUTH_HOST || Boolean(SECTION_HOSTS[host]);
}

// Global pages that live on every host as-is (never section-prefixed on
// subdomains): sign-in, signup/apply, pricing, legal, etc.
const GLOBAL_PATHS = new Set([
  "about",
  "ai-engine",
  "app",
  "auth",
  "broadcasts",
  "cancellation",
  "confirm-email-change",
  "contact",
  "development",
  "disclaimer",
  "download",
  "founding",
  "founder",
  "killzones",
  "llm",
  "pricing",
  "privacy",
  "refund",
  "scam-check",
  "scam-tool",
  "terms",
  "reset-password",
  "leads-signin",
  "leads-signup",
]);

function isGlobalPath(pathname: string): boolean {
  const first = pathname.split("/").filter(Boolean)[0];
  return Boolean(first && GLOBAL_PATHS.has(first));
}

/**
 * Server-level redirect target.
 *
 * 1. Send all jenvu.com subdomains (and www) to the apex domain with the
 *    correct section prefix so old bookmarks still work.
 * 2. On the apex domain, redirect legacy /dashboard/child URLs to the
 *    clean /child URL (the router will map back to /dashboard/child internally).
 */
export function apexRedirectTarget(url: URL): string | null {
  const host = url.hostname.toLowerCase();
  const p = url.pathname;
  if (isReserved(p)) return null;

  // 1. Subdomain -> apex (with section prefix). Handle www. specially.
  if (host === `www.${ROOT_DOMAIN}`) {
    if (isReserved(p)) return null;
    const next = new URL(url);
    next.hostname = ROOT_DOMAIN;
    return next.toString();
  }

  if (host === AUTH_HOST) {
    if (p === "/auth") {
      const next = new URL(url);
      next.pathname = "/sign-in";
      return next.toString();
    }
    if (p === "/") {
      const next = new URL(url);
      next.pathname = "/sign-in";
      return next.toString();
    }
    if (p === "/sign-in") return null;
    const next = new URL(url);
    next.hostname = ROOT_DOMAIN;
    return next.toString();
  }

  if (host !== ROOT_DOMAIN && host.endsWith(`.${ROOT_DOMAIN}`)) {
    const sub = host.slice(0, host.length - `.${ROOT_DOMAIN}`.length);
    if (sub.includes(".")) return null;
    // dash/blogs/leads/support subdomains host their sections directly —
    // but a path belonging to another section goes to that section's host
    // (e.g. dash.jenvu.com/help -> support.jenvu.com/).
    if (sub === "dash" || SECTION_HOSTS[host]) {
      if (isGlobalPath(p)) {
        const next = new URL(url);
        if (p === "/auth") {
          next.hostname = AUTH_HOST;
          next.pathname = "/sign-in";
        } else {
          next.hostname = ROOT_DOMAIN;
        }
        return next.toString();
      }
      const target = hostForPath(p);
      if (target && target.host !== host) {
        const next = new URL(url);
        next.hostname = target.host;
        next.pathname =
          p === target.prefix ? "/" : p.slice(target.prefix.length);
        return next.toString();
      }
      if (sub === "dash") {
        if (p === "/") {
          const next = new URL(url);
          next.pathname = "/dashboard";
          return next.toString();
        }
        const segments = p.split("/").filter(Boolean);
        if (segments[0] === "admin" || (segments.length === 1 && DASHBOARD_CHILDREN.has(segments[0]))) {
          const next = new URL(url);
          next.pathname = `/dashboard${p}`;
          return next.toString();
        }
      }
      return null;
    }
    const section = SUBDOMAIN_SECTIONS[sub];
    if (!section) return null;
    const next = new URL(url);
    next.hostname = ROOT_DOMAIN;
    // For the dash section, the dashboard child pages are exposed at the root.
    if (section === "/dashboard") {
      next.pathname = p === "/" ? "/dashboard" : p;
    } else {
      next.pathname = p === "/" ? section : `${section}${p}`;
    }
    return next.toString();
  }


  // 1b. Cross-section navigation: if the path belongs to a section hosted on
  // another subdomain (e.g. dash.jenvu.com/help), send it to that host.
  if (isManagedHost(host)) {
    const target = hostForPath(p);
    if (target && target.host !== host) {
      const next = new URL(url);
      next.hostname = target.host;
      next.pathname = target.prefix === "/dashboard"
        ? p
        : p === target.prefix
          ? "/"
          : p.slice(target.prefix.length);
      return next.toString();
    }
  }

  if (isApex(host) && p === "/auth") {
    const next = new URL(url);
    next.hostname = AUTH_HOST;
    next.pathname = "/sign-in";
    return next.toString();
  }

  // 2. Apex domain: the dashboard lives on dash.jenvu.com — send every
  // dashboard URL there (jenvu.com/dashboard/billing -> dash.jenvu.com/billing).
  if (isApex(host)) {
    const segments = p.split("/").filter(Boolean);
    const dashHost = `dash.${ROOT_DOMAIN}`;

    // /dashboard and /dashboard/*
    if (segments[0] === "dashboard") {
      const next = new URL(url);
      next.hostname = dashHost;
      next.pathname = p;
      return next.toString();
    }

    // Clean dashboard child URLs: /alerts, /billing, /admin/*
    if (segments.length >= 1) {
      const child = segments[0];
      if (child === "admin" || DASHBOARD_CHILDREN.has(child)) {
        const next = new URL(url);
        next.hostname = dashHost;
        next.pathname = p;
        return next.toString();
      }
    }
  }

  return null;
}

/**
 * External address-bar URL -> internal router URL.
 *
 * On the apex domain, map clean URLs back to the internal route tree.
 */
export function rewriteInput(url: URL): URL | undefined {
  const host = url.hostname.toLowerCase();
  if (!isApex(host) && !isDash(host) && host !== AUTH_HOST && !SECTION_HOSTS[host]) return undefined;
  const p = url.pathname;
  if (isReserved(p)) return undefined;

  if (host === AUTH_HOST && (p === "/" || p === "/sign-in")) {
    const next = new URL(url);
    next.pathname = "/auth";
    return next;
  }

  // Section subdomains: blogs.jenvu.com/ -> /insights,
  // support.jenvu.com/getting-started -> /help/getting-started, etc.
  const section = SECTION_HOSTS[host];
  if (section) {
    if (p === "/" || p === "") {
      const next = new URL(url);
      next.pathname = section;
      return next;
    }
    // Global pages (auth, founding, pricing, ...) resolve as-is on every host.
    if (isGlobalPath(p)) return undefined;
    if (p !== section && !p.startsWith(`${section}/`)) {
      const next = new URL(url);
      next.pathname = `${section}${p}`;
      return next;
    }
    return undefined;
  }

  // On the dash subdomain the dashboard lives at the root:
  // dash.jenvu.com/ -> /dashboard, dash.jenvu.com/alerts -> /dashboard/alerts
  if (isDash(host) && (p === "/" || p === "")) {
    const next = new URL(url);
    next.pathname = "/dashboard";
    return next;
  }

  // Admin paths: /admin/* -> /dashboard/admin/*
  if (p === "/admin" || p.startsWith("/admin/")) {
    const next = new URL(url);
    next.pathname = `/dashboard${p}`;
    return next;
  }

  // Dashboard child paths: /alerts -> /dashboard/alerts
  const segments = p.split("/").filter(Boolean);
  if (segments.length === 1 && DASHBOARD_CHILDREN.has(segments[0])) {
    const next = new URL(url);
    next.pathname = `/dashboard/${segments[0]}`;
    return next;
  }

  return undefined;
}

/**
 * Internal router URL -> external address-bar URL.
 *
 * Strips the /dashboard prefix from dashboard children so the address bar stays
 * clean while the internal route tree still resolves.
 */
export function rewriteOutput(url: URL): URL | undefined {
  const host = url.hostname.toLowerCase();
  if (!isApex(host) && !isDash(host) && host !== AUTH_HOST && !SECTION_HOSTS[host]) return undefined;
  const p = url.pathname;
  if (isReserved(p)) return undefined;

  if (p === "/auth") {
    const next = new URL(url);
    next.hostname = AUTH_HOST;
    next.pathname = "/sign-in";
    return next;
  }

  if (host === AUTH_HOST && p !== "/auth") {
    const next = new URL(url);
    next.hostname = ROOT_DOMAIN;
    return next;
  }

  // Cross-section navigation: links to a section hosted on another subdomain
  // point at that host with the prefix stripped (e.g. on dash.jenvu.com,
  // /help/getting-started -> support.jenvu.com/getting-started).
  const target = hostForPath(p);
  if (target && target.host !== host) {
    const next = new URL(url);
    next.hostname = target.host;
    next.pathname = target.prefix === "/dashboard"
      ? p
      : p === target.prefix
        ? "/"
        : p.slice(target.prefix.length);
    return next;
  }

  // Section subdomains: strip the section prefix so the address bar stays
  // clean — /insights/my-post -> blogs.jenvu.com/my-post
  const section = SECTION_HOSTS[host];
  if (section) {
    if (isGlobalPath(p) || p === "/") {
      const next = new URL(url);
      next.hostname = ROOT_DOMAIN;
      return next;
    }
    if (p === section) {
      const next = new URL(url);
      next.pathname = "/";
      return next;
    }
    if (p.startsWith(`${section}/`)) {
      const next = new URL(url);
      next.pathname = p.slice(section.length);
      return next;
    }
    return undefined;
  }

  // On the apex domain, dashboard links point at the dash subdomain.
  if (isApex(host) && (p === "/dashboard" || p.startsWith("/dashboard/"))) {
    const next = new URL(url);
    next.hostname = `dash.${ROOT_DOMAIN}`;
    next.pathname = p;
    return next;
  }

  return undefined;
}
