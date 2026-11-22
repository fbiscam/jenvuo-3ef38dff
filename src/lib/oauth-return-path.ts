export function oauthReturnPath(value: unknown): string {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//") || /[\\\u0000-\u001f\u007f]/.test(value)) return "/";
  // A fixed parsing origin keeps route search validation safe during SSR.
  const origin = "https://app.invalid";
  try {
    const target = new URL(value, origin);
    if (target.origin !== origin || target.pathname.startsWith("//")) return "/";
    return target.pathname + target.search + target.hash;
  } catch {
    return "/";
  }
}

/** Default completed authentication to Overview, preserving safe explicit destinations. */
export function authDestination(value?: string): string {
  const safe = oauthReturnPath(value);
  if (safe === "/") return "/dashboard";
  if (safe.startsWith("/.lovable/oauth/consent")) return safe;
  return safe.split(/[?#]/)[0] || "/dashboard";
}
