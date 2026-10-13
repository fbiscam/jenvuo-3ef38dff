/** Terminal history must not switch to thin spot-token order books. */
export function isTerminalGoldProvider(provider: string): boolean {
  return provider === "Gate" || provider === "Binance";
}