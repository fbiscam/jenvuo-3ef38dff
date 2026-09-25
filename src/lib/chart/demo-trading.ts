export type DemoSide = "buy" | "sell";

export type DemoPosition = {
  id: string;
  side: DemoSide;
  quantity: number;
  entryPrice: number;
  openedAt: number;
  stopLoss?: number | null;
  takeProfit?: number | null;
};

export type DemoClosedTrade = {
  id: string;
  side: DemoSide;
  quantity: number;
  entryPrice: number;
  exitPrice: number;
  pnl: number;
  reason: "tp" | "sl" | "manual";
  closedAt: number;
};

export type DemoAccount = {
  balance: number;
  realizedPnl: number;
  positions: DemoPosition[];
  history?: DemoClosedTrade[];
  orders?: DemoPendingOrder[];
};

export const DEMO_STARTING_BALANCE = 100_000;

export const createDemoAccount = (): DemoAccount => ({
  balance: DEMO_STARTING_BALANCE,
  realizedPnl: 0,
  positions: [],
  history: [],
});

/** Returns the SL/TP price hit by the current price, if any. */
export function triggeredExit(position: DemoPosition, price: number): { reason: "tp" | "sl"; price: number } | null {
  return triggeredExitInRange(position, price, price);
}

/**
 * Returns the configured exit touched anywhere inside a live mid-price range.
 * Long positions execute against bid; short positions execute against ask.
 * If an unknown intrabar path spans both exits, SL wins conservatively.
 */
export function triggeredExitInRange(position: DemoPosition, low: number, high: number): { reason: "tp" | "sl"; price: number } | null {
  const { stopLoss: sl, takeProfit: tp, side } = position;
  const lowQuote = bidAsk(Math.min(low, high));
  const highQuote = bidAsk(Math.max(low, high));
  if (side === "buy") {
    if (sl != null && lowQuote.bid <= sl) return { reason: "sl", price: sl };
    if (tp != null && highQuote.bid >= tp) return { reason: "tp", price: tp };
  } else {
    if (sl != null && highQuote.ask >= sl) return { reason: "sl", price: sl };
    if (tp != null && lowQuote.ask <= tp) return { reason: "tp", price: tp };
  }
  return null;
}

export function positionPnl(position: DemoPosition, currentPrice: number): number {
  const move = currentPrice - position.entryPrice;
  return (position.side === "buy" ? move : -move) * position.quantity;
}

export function accountMetrics(account: DemoAccount, currentPrice: number) {
  const unrealizedPnl = account.positions.reduce(
    (sum, position) => sum + positionPnl(position, currentPrice),
    0,
  );
  const openNotional = account.positions.reduce(
    (sum, position) => sum + position.entryPrice * position.quantity,
    0,
  );
  const equity = account.balance + unrealizedPnl;
  return {
    unrealizedPnl,
    openNotional,
    equity,
    availableBuyingPower: Math.max(0, equity - openNotional),
  };
}

export function closeDemoPosition(
  account: DemoAccount,
  positionId: string,
  currentPrice: number,
  reason: DemoClosedTrade["reason"] = "manual",
): DemoAccount {
  const position = account.positions.find((item) => item.id === positionId);
  if (!position) return account;
  const pnl = positionPnl(position, currentPrice);
  return {
    ...account,
    balance: account.balance + pnl,
    realizedPnl: account.realizedPnl + pnl,
    positions: account.positions.filter((item) => item.id !== positionId),
    history: [
      { id: position.id, side: position.side, quantity: position.quantity, entryPrice: position.entryPrice, exitPrice: currentPrice, pnl, reason, closedAt: Date.now() },
      ...(account.history ?? []),
    ].slice(0, 20),
  };
}

// ---- Pending orders, spread & leverage (paper trading) ----
export const DEMO_SPREAD = 0.4; // $ between bid and ask
export const DEMO_LEVERAGE = 10;

export const bidAsk = (mid: number) => ({ bid: mid - DEMO_SPREAD / 2, ask: mid + DEMO_SPREAD / 2 });

export type DemoOrderType = "market" | "limit" | "stop";

export type DemoPendingOrder = {
  id: string;
  side: DemoSide;
  type: "limit" | "stop";
  quantity: number;
  price: number;
  stopLoss?: number | null;
  takeProfit?: number | null;
  createdAt: number;
};

/** True when a pending order should fill at the current mid price. */
export function pendingShouldFill(order: DemoPendingOrder, mid: number): boolean {
  const { bid, ask } = bidAsk(mid);
  if (order.side === "buy") return order.type === "limit" ? ask <= order.price : ask >= order.price;
  return order.type === "limit" ? bid >= order.price : bid <= order.price;
}
