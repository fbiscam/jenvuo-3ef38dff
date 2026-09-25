import { describe, it } from "node:test";
import {
  accountMetrics,
  closeDemoPosition,
  createDemoAccount,
  positionPnl,
  triggeredExitInRange,
  type DemoPosition,
} from "./demo-trading";
import { expect } from "./test-expect";

const buy: DemoPosition = {
  id: "buy-1",
  side: "buy",
  quantity: 2,
  entryPrice: 3000,
  openedAt: 1,
};

const sell: DemoPosition = {
  id: "sell-1",
  side: "sell",
  quantity: 1,
  entryPrice: 3010,
  openedAt: 2,
};

describe("demo trading", () => {
  it("starts with a virtual $100,000 balance", () => {
    expect(createDemoAccount()).toEqual({ balance: 100000, realizedPnl: 0, positions: [], history: [] });
  });

  it("calculates long and short profit from the current price", () => {
    expect(positionPnl(buy, 3010)).toBe(20);
    expect(positionPnl(sell, 3000)).toBe(10);
  });

  it("calculates equity and available buying power", () => {
    const metrics = accountMetrics({ balance: 100000, realizedPnl: 0, positions: [buy, sell] }, 3010);
    expect(metrics.unrealizedPnl).toBe(20);
    expect(metrics.equity).toBe(100020);
    expect(metrics.openNotional).toBe(9010);
    expect(metrics.availableBuyingPower).toBe(91010);
  });

  it("realizes profit when a position closes", () => {
    const account = closeDemoPosition(
      { balance: 100000, realizedPnl: 0, positions: [buy, sell] },
      buy.id,
      3010,
    );
    expect(account.balance).toBe(100020);
    expect(account.realizedPnl).toBe(20);
    expect(account.positions).toEqual([sell]);
  });

  it("detects BUY stop-loss and take-profit touches across the live range", () => {
    const protectedBuy = { ...buy, stopLoss: 2995, takeProfit: 3015 };
    expect(triggeredExitInRange(protectedBuy, 2995.1, 3004)).toEqual({ reason: "sl", price: 2995 });
    expect(triggeredExitInRange(protectedBuy, 3002, 3015.3)).toEqual({ reason: "tp", price: 3015 });
  });

  it("detects SELL stop-loss and take-profit touches across the live range", () => {
    const protectedSell = { ...sell, stopLoss: 3015, takeProfit: 2995 };
    expect(triggeredExitInRange(protectedSell, 3004, 3014.9)).toEqual({ reason: "sl", price: 3015 });
    expect(triggeredExitInRange(protectedSell, 2994.7, 3006)).toEqual({ reason: "tp", price: 2995 });
  });

  it("keeps a position open when neither exit was touched", () => {
    const protectedBuy = { ...buy, stopLoss: 2995, takeProfit: 3015 };
    expect(triggeredExitInRange(protectedBuy, 2996, 3014)).toBe(null);
  });
});