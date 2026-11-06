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
