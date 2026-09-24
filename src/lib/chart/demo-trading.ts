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
  const { stopLoss: sl, takeProfit: tp, side } = position;
  if (side === "buy") {
    if (sl && price <= sl) return { reason: "sl", price: sl };
    if (tp && price >= tp) return { reason: "tp", price: tp };
  } else {
    if (sl && price >= sl) return { reason: "sl", price: sl };
    if (tp && price <= tp) return { reason: "tp", price: tp };
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
    balance: account.balance + pnl,
    realizedPnl: account.realizedPnl + pnl,
    positions: account.positions.filter((item) => item.id !== positionId),
    history: [
      { id: position.id, side: position.side, quantity: position.quantity, entryPrice: position.entryPrice, exitPrice: currentPrice, pnl, reason, closedAt: Date.now() },
      ...(account.history ?? []),
    ].slice(0, 20),
  };
}