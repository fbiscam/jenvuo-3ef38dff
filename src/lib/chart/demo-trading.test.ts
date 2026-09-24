import { describe, expect, test } from "bun:test";
import {
  accountMetrics,
  closeDemoPosition,
  createDemoAccount,
  positionPnl,
  type DemoPosition,
} from "./demo-trading";

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
  test("starts with a virtual $100,000 balance", () => {
    expect(createDemoAccount()).toEqual({ balance: 100000, realizedPnl: 0, positions: [] });
  });

  test("calculates long and short profit from the current price", () => {
    expect(positionPnl(buy, 3010)).toBe(20);
    expect(positionPnl(sell, 3000)).toBe(10);
  });

  test("calculates equity and available buying power", () => {
    const metrics = accountMetrics({ balance: 100000, realizedPnl: 0, positions: [buy, sell] }, 3010);
    expect(metrics.unrealizedPnl).toBe(20);
    expect(metrics.equity).toBe(100020);
    expect(metrics.openNotional).toBe(9010);
    expect(metrics.availableBuyingPower).toBe(91010);
  });

  test("realizes profit when a position closes", () => {
    const account = closeDemoPosition(
      { balance: 100000, realizedPnl: 0, positions: [buy, sell] },
      buy.id,
      3010,
    );
    expect(account.balance).toBe(100020);
    expect(account.realizedPnl).toBe(20);
    expect(account.positions).toEqual([sell]);
  });
});