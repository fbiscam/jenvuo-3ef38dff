import type { QueryClient } from "@tanstack/react-query";
import type { CreditState } from "./credits.functions";

/** Cancel older reads first so they cannot overwrite the just-redeemed snapshot. */
export async function applyPromoSnapshot(client: QueryClient, userId: string, state: CreditState) {
  const queryKey = ["credit-state", userId];
  await client.cancelQueries({ queryKey });
  client.setQueryData(queryKey, state);
}

/** A redeemed gift stays successful even if its follow-up snapshot or email fails. */
export async function completePromoActivation<T extends { ok: boolean }>(
  result: T,
  effects: { snapshot: () => Promise<CreditState>; notify: () => void; onError: () => void },
) {
  if (!result.ok) return { ...result, creditState: null };
  let creditState: CreditState | null = null;
  try { creditState = await effects.snapshot(); } catch { effects.onError(); }
  effects.notify();
  return { ...result, creditState };
}