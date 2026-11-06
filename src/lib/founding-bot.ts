/**
 * Founding JX Bot rule (the database function `founding_bot_check` applies the same rule):
 * approved Founding members get the bot after ID verification. 30 days after approval the
 * Founding plan, credit and bot access all end; the member is told whether the bot reached
 * the $200 profit milestone, and a paid plan is needed to keep using it.
 */
export const FOUNDING_BOT_REVIEW_DAYS = 30;
export const FOUNDING_PROFIT_MILESTONE_USD = 200;

export type FoundingBotState = "none" | "awaiting_id" | "active" | "locked";

export type FoundingBotInput = {
  status: string | null;
  approved_at: string | null;
  documents_verified_at: string | null;
  bot_locked_at: string | null;
} | null;

const APPROVED = new Set(["approved", "active", "graduated", "verified"]);

export function foundingBotState(app: FoundingBotInput, now = Date.now()): FoundingBotState {
  if (!app || !app.approved_at || !APPROVED.has(String(app.status))) return "none";
  if (app.bot_locked_at) return "locked";
  const review = Date.parse(app.approved_at) + FOUNDING_BOT_REVIEW_DAYS * 86400000;
  if (now >= review) return "locked";
  if (!app.documents_verified_at) return "awaiting_id";
  return "active";
}

/** Whether the bot's Founding-period profit reached the milestone (decides the 30-day notice). */
export function reachedFoundingMilestone(profitUsd: number): boolean {
  return (Number(profitUsd) || 0) >= FOUNDING_PROFIT_MILESTONE_USD;
}

/**
 * Sidebar JX Bot item: open for admins, active paid plans and verified Founding members;
 * locked (lock icon, not clickable) for everyone else.
 */
export function jxBotNavOpen(input: { isAdmin: boolean; allowed: boolean }): boolean {
  return input.isAdmin || input.allowed;
}

/** Approved Founding applicants (any state but "none") are Founding members. */
export function isFoundingMember(state: FoundingBotState | string | null | undefined): boolean {
  return !!state && state !== "none";
}

/**
 * Approved Founding members whose ID was verified. Only they see JX Bot in plans, pay the
 * bot-included price, and can run JX Bot on a paid plan.
 */
export function isVerifiedFoundingMember(info: { state: FoundingBotState | string | null | undefined; verified_at?: string | null } | null | undefined): boolean {
  return !!info && isFoundingMember(info.state) && info.state !== "awaiting_id" && !!info.verified_at;
}

export type JxBotAction = { label: string; to: "/founding" | "/dashboard/documents" | "/dashboard/pay" };

/**
 * JX Bot page button. JX Bot is offered to approved Founding members (first month free,
 * then a paid plan): non-members are asked to apply, members waiting on ID upload it,
 * members on their free Founding month see "Upgrade", members whose month ended see "Buy now".
 */
export function jxBotAction(input: { state: FoundingBotState | string | null | undefined; allowed: boolean; viaFounding: boolean }): JxBotAction | null {
  if (!isFoundingMember(input.state)) return input.allowed ? null : { label: "Apply for Founding Program", to: "/founding" };
  if (input.allowed) return input.viaFounding ? { label: "Upgrade", to: "/dashboard/pay" } : null;
  if (input.state === "awaiting_id") return { label: "Upload ID", to: "/dashboard/documents" };
  return { label: "Buy now", to: "/dashboard/pay" };
}

export type PurchaseGate = { canBuy: boolean; reason: "ok" | "apply" | "verify_id" };

/**
 * Who can pay for a plan or top-up: admins and approved Founding members whose ID is
 * verified. Founding members still waiting on ID must verify first (any day of their
 * month); everyone else is sent to apply for the Founding Program.
 */
export function purchaseGate(input: { isAdmin: boolean; member: boolean; verified: boolean }): PurchaseGate {
  if (input.isAdmin || (input.member && input.verified)) return { canBuy: true, reason: "ok" };
  if (input.member) return { canBuy: false, reason: "verify_id" };
  return { canBuy: false, reason: "apply" };
}

/** Message shown (and returned by the server) when a purchase is refused. */
export const PURCHASE_BLOCK_MESSAGE: Record<Exclude<PurchaseGate["reason"], "ok">, string> = {
  apply: "Plans and credit are only for approved Founding Program members. Apply at jenvu.com/founding.",
  verify_id: "Verify your ID first. Plans can be bought once your documents are approved.",
};
