/**
 * Pure rule: which Google / Apple sign-ins count as a brand-new sign-up that must
 * pass the sign-up checks (and get the free trial). Used by finishSocialSignup.
 */
export const SOCIAL_SIGNUP_WINDOW_MS = 30 * 60_000;

export function isFreshSocialSignup(input: {
  provider: string;
  createdAt: string | undefined;
  now: number;
  alreadyProcessed: boolean;
}): boolean {
  if (input.alreadyProcessed) return false;
  if (!input.provider || input.provider === "email") return false;
  const created = input.createdAt ? Date.parse(input.createdAt) : NaN;
  if (!Number.isFinite(created)) return false;
  return input.now - created <= SOCIAL_SIGNUP_WINDOW_MS;
}
