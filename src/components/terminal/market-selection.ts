import type { ChartAsset } from "./terminal-assets";

export type MarketSelection = { asset: ChartAsset; infoAsset: ChartAsset };
export function selectTerminalMarket(
  state: MarketSelection,
  action: { target: "chart" | "info"; asset: ChartAsset },
): MarketSelection {
  return action.target === "chart"
    ? { asset: action.asset, infoAsset: action.asset }
    : { ...state, infoAsset: action.asset };
}