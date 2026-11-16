/**
 * Founding JX Bot rule (the database function `founding_bot_check` applies the same rule):
 * approved Founding members get the bot after ID verification. 30 days after that verification the
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
  /** Day the ID was verified and the Founding month began (older rows: null, use approval). */
  founding_started_at?: string | null;
} | null;

const APPROVED = new Set(["approved", "active", "graduated", "verified"]);

export function foundingBotState(app: FoundingBotInput, now = Date.now()): FoundingBotState {
  if (!app || !app.approved_at || !APPROVED.has(String(app.status))) return "none";
  if (app.bot_locked_at) return "locked";
  const review = Date.parse(app.founding_started_at || app.approved_at) + FOUNDING_BOT_REVIEW_DAYS * 86400000;
  if (now >= review) return "locked";
  if (!app.documents_verified_at) return "awaiting_id";
  return "active";
}

/** Whether the bot's Founding-period profit reached the milestone (decides the 30-day notice). */
export function reachedFoundingMilestone(profitUsd: number): boolean {
  return (Number(profitUsd) || 0) >= FOUNDING_PROFIT_MILESTONE_USD;
}

/**
 * Sidebar JX Bot item: open for every signed-in user (the bot is plan-based, Free included).
 */
export function jxBotNavOpen(input: { isAdmin: boolean; allowed: boolean }): boolean {
  return input.isAdmin || input.allowed;
}

/** Approved Founding applicants (any state but "none") are Founding members. */
export function isFoundingMember(state: FoundingBotState | string | null | undefined): boolean {
  return !!state && state !== "none";
}

/**
 * Approved Founding members whose ID was verified (their Founding month runs the chosen plan).
 */
export function isVerifiedFoundingMember(info: { state: FoundingBotState | string | null | undefined; verified_at?: string | null } | null | undefined): boolean {
  return !!info && isFoundingMember(info.state) && info.state !== "awaiting_id" && !!info.verified_at;
}

export type JxBotAction = { label: string; to: "/founding" | "/dashboard/documents" | "/dashboard/pay" };

/**
 * JX Bot page button. The bot is plan-based for everyone: Free and Founding-month users see
 * "Upgrade" (more IPs, a % target), members still waiting on ID upload it, paid plans see nothing.
 */
export function jxBotAction(input: { state: FoundingBotState | string | null | undefined; allowed: boolean; viaFounding: boolean; plan?: string | null }): JxBotAction | null {
  if (input.state === "awaiting_id") return { label: "Upload ID", to: "/dashboard/documents" };
  if (input.viaFounding || !input.plan || input.plan === "free") return { label: "Upgrade", to: "/dashboard/pay" };
  return null;
}

export type PurchaseGate = { canBuy: boolean; reason: "ok" | "verify_id" | "no_topup" };

/**
 * Who can pay: plans are open to every signed-in user; approved Founding members still waiting
 * on ID verify first. Credit top-ups are no longer sold (plans only).
 */
export function purchaseGate(input: { isAdmin: boolean; member: boolean; verified: boolean; kind?: "plan" | "topup" }): PurchaseGate {
  if (input.kind === "topup") return { canBuy: false, reason: "no_topup" };
  if (input.isAdmin) return { canBuy: true, reason: "ok" };
  if (input.member && !input.verified) return { canBuy: false, reason: "verify_id" };
  return { canBuy: true, reason: "ok" };
}

/**
 * During the Founding month the plan already given as the trial can't be bought again;
 * the other plans can. After the month ends any plan can be bought.
 */
export function isTrialPlanLocked(planId: string | null | undefined, trialPlan: string | null | undefined): boolean {
  return !!planId && !!trialPlan && planId === trialPlan;
}

export const TRIAL_PLAN_MESSAGE = "You already have this plan in your Founding month. Pick another plan.";

/** Message shown (and returned by the server) when a purchase is refused. */
export const PURCHASE_BLOCK_MESSAGE: Record<Exclude<PurchaseGate["reason"], "ok">, string> = {
  verify_id: "Verify your ID first. Plans can be picked once your documents are approved.",
  no_topup: "Credit top-ups are no longer offered. Pick a plan instead.",
};
