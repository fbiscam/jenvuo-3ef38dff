/**
 * ID-check rule for approved members whose ID isn't verified yet: every dashboard page
 * can be opened and looked at, but actions (creating API keys, Chat, etc.) are blocked.
 * These pages stay fully usable: Overview, settings pages, Documents, Billing, Payments
 * (Payments still blocks picking a plan, see `purchaseGate`) and the admin pages.
 */
export const ID_OPEN_PATHS = [
  "/dashboard",
  "/dashboard/profile",
  "/dashboard/security",
  "/dashboard/settings",
  "/dashboard/documents",
  "/dashboard/billing",
  "/dashboard/pay",
  "/dashboard/payment",
];

/** Application statuses that make someone an approved Founding member (the only ones the ID lock applies to). */
export const ID_LOCK_APPLICATION_STATUSES = ["approved", "active", "graduated", "verified"];

/**
 * Whether this account's actions are blocked until its ID is verified.
 * Only approved members are locked; pending, rejected or waitlisted applicants are not.
 */
export function idActionsLocked(input: {
  isAdmin: boolean;
  documentStatus: string | null | undefined;
  hasApplication: boolean;
  applicationStatus: string | null | undefined;
}): boolean {
  if (input.isAdmin || !input.hasApplication) return false;
  if (!ID_LOCK_APPLICATION_STATUSES.includes(String(input.applicationStatus || "").toLowerCase())) return false;
  return String(input.documentStatus || "").toLowerCase() !== "verified";
}

/** Whether a page shows in look-only mode (visible, no actions). */
export function idViewOnly(pathname: string, locked: boolean): boolean {
  if (!locked) return false;
  const p = pathname.replace(/\/+$/, "") || "/dashboard";
  if (p.startsWith("/dashboard/admin")) return false;
  return !ID_OPEN_PATHS.includes(p);
}

export const ID_ACTION_MESSAGE = "Verify your ID first. You can look around, but actions open once your ID is approved.";
