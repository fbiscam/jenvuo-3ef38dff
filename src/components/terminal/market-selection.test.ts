import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { selectTerminalMarket } from "./market-selection";
import { dailyFeedVolume } from "./feed-volume";

describe("Terminal independent market selection", () => {
  it("changing Technicals & News to EUR/USD leaves the Gold chart selected", () => {
    assert.deepEqual(selectTerminalMarket({ asset: "XAUUSD", infoAsset: "XAUUSD" }, { target: "info", asset: "EURUSD" }), { asset: "XAUUSD", infoAsset: "EURUSD" });
  });
  it("changing the chart to BTC/USD also updates the information pair", () => {
    assert.deepEqual(selectTerminalMarket({ asset: "XAUUSD", infoAsset: "EURUSD" }, { target: "chart", asset: "BTCUSD" }), { asset: "BTCUSD", infoAsset: "BTCUSD" });
  });
  it("volume uses today's bar and the previous 30 daily bars", () => {
    assert.deepEqual(dailyFeedVolume([{ volume: 999 }, ...Array.from({ length: 30 }, () => ({ volume: 10 })), { volume: 20 }]), { today: 20, avg: 10 });
  });
});