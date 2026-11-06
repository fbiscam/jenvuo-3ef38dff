/**
 * Founding JX Bot rule (the database function `founding_bot_check` applies the same rule):
 * approved Founding members get the bot after ID verification; once 30 days have passed since
 * approval and the bot's total profit is $200 or more, it locks until they move to a paid plan.
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

export function foundingBotState(app: FoundingBotInput, profitUsd: number, now = Date.now()): FoundingBotState {
  if (!app || !app.approved_at || !APPROVED.has(String(app.status))) return "none";
  if (app.bot_locked_at) return "locked";
  if (!app.documents_verified_at) return "awaiting_id";
  const review = Date.parse(app.approved_at) + FOUNDING_BOT_REVIEW_DAYS * 86400000;
  if (now >= review && (Number(profitUsd) || 0) >= FOUNDING_PROFIT_MILESTONE_USD) return "locked";
  return "active";
}
