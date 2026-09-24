export type DemoSide = "buy" | "sell";

export type DemoPosition = {
  id: string;
  side: DemoSide;
  quantity: number;
  entryPrice: number;
  openedAt: number;
};

export type DemoAccount = {
  balance: number;
  realizedPnl: number;
  positions: DemoPosition[];
};

export const DEMO_STARTING_BALANCE = 100_000;

export const createDemoAccount = (): DemoAccount => ({
  balance: DEMO_STARTING_BALANCE,
  realizedPnl: 0,
  positions: [],
});

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
): DemoAccount {
  const position = account.positions.find((item) => item.id === positionId);
  if (!position) return account;
  const pnl = positionPnl(position, currentPrice);
  return {
    balance: account.balance + pnl,
    realizedPnl: account.realizedPnl + pnl,
    positions: account.positions.filter((item) => item.id !== positionId),
  };
}