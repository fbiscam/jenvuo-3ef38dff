import { describe, it } from "node:test";
import { expect } from "./test-expect";
import { isTerminalGoldProvider } from "./gold-feed-policy";

describe("terminal gold history providers", () => {
  it("keeps Gate primary and Binance available as backup", () => {
    expect(isTerminalGoldProvider("Gate")).toBe(true);
    expect(isTerminalGoldProvider("Binance")).toBe(true);
  });

  it("rejects the Gemini feed that produced flat bodies and giant wicks", () => {
    expect(isTerminalGoldProvider("Gemini")).toBe(false);
  });

  it("does not replace terminal history with other spot-token books", () => {
    for (const provider of ["KuCoin", "Bitget", "Bybit", "OKX", "Kraken"]) {
      expect(isTerminalGoldProvider(provider)).toBe(false);
    }
  });
});