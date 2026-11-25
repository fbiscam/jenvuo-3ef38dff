import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseChartCommands } from "./chart-commands";
const KEYS = ["1m", "3m", "5m", "10m", "15m", "30m", "45m", "1h", "2h", "3h", "4h", "6h", "12h", "1d"];
describe("parseChartCommands", () => {
  it("adds RSI", () => assert.deepEqual(parseChartCommands("add RSI", KEYS), [{ kind: "indicator", id: "rsi", on: true }]));
  it("removes MACD and EMA 200", () =>
    assert.deepEqual(parseChartCommands("remove macd and ema 200", KEYS), [
      { kind: "indicator", id: "ema200", on: false },
      { kind: "indicator", id: "macd", on: false },
    ]));
  it("switches timeframe to 4H", () => assert.deepEqual(parseChartCommands("switch to 4H", KEYS), [{ kind: "timeframe", key: "4h" }]));
  it("switches to 10m", () => assert.deepEqual(parseChartCommands("change timeframe to 10m", KEYS), [{ kind: "timeframe", key: "10m" }]));
  it("plain question is not a command", () => assert.deepEqual(parseChartCommands("where is liquidity on 1H?", KEYS), []));
});
