import { describe, it } from "node:test";
import assert from "node:assert/strict";
const expect = (v: unknown) => ({ toBe: (x: unknown) => assert.equal(v, x), toEqual: (x: unknown) => assert.deepEqual(v, x), toBeNull: () => assert.equal(v, null) });
import { impactLevel, pairsFor } from "./pair-news";

describe("pair news", () => {
  it("keeps High, Medium and Low; drops holidays", () => {
    expect(impactLevel("High")).toBe("High");
    expect(impactLevel("Medium")).toBe("Medium");
    expect(impactLevel("Low")).toBe("Low");
    expect(impactLevel("Holiday")).toBeNull();
  });
  it("USD news moves all three pairs, even low impact", () => {
    expect(pairsFor("USD", "Low")).toEqual(["XAUUSD", "EURUSD", "BTCUSD"]);
  });
  it("EUR low news only moves EUR/USD", () => {
    expect(pairsFor("EUR", "Low")).toEqual(["EURUSD"]);
  });
  it("high-impact CNY moves Gold and BTC but not EUR/USD", () => {
    expect(pairsFor("CNY", "High")).toEqual(["XAUUSD", "BTCUSD"]);
  });
  it("medium GBP news moves none of the pairs", () => {
    expect(pairsFor("GBP", "Medium")).toEqual([]);
  });
});
