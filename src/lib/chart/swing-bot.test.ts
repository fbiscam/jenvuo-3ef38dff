import { describe, it } from "node:test";
import { expect } from "./test-expect";
import { confirmedSwings, simulate, isFridayCutoff, type Bar } from "./swing-bot";

const H = 3600;
const mk = (rows: [number, number, number, number][], t0 = Date.UTC(2026, 10, 23) / 1000): Bar[] =>
  rows.map(([open, high, low, close], i) => ({ time: t0 + i * H, open, high, low, close }));
const spec = (symbol: string) => ({ symbol, pip: 1, usdPerUnit: 1, weekendGuard: true });

describe("JX Bot H1 swing rules", () => {
  // up, up, up, swing high (bar 3), Candle 1 bearish
  const top = mk([[9, 9.5, 8, 9], [9, 9.6, 8, 9], [9, 9.7, 8, 9], [9, 9.8, 8, 9], [10, 11, 9, 10.5], [10.5, 12, 10, 11.5], [11.5, 13, 11, 12.5], [12.5, 15, 12, 14], [14, 14.5, 12, 12.2]]);
  it("confirms a swing high only when Candle 1 closes bearish, SL at the swing wick", () => {
    const s = confirmedSwings(top, "X");
    expect(s).toHaveLength(1);
    expect(s[0]!.dir).toBe(-1);
    expect(s[0]!.price).toBe(12.2);
    expect(s[0]!.sl).toBe(15);
  });
  it("no swing when Candle 1 closes the other way", () => {
    const bull = top.map((b, i) => (i === 8 ? { ...b, close: 14.4 } : b));
    expect(confirmedSwings(bull, "X").filter((s) => s.dir === -1)).toHaveLength(0);
  });
  it("same-candle SL hit closes at the swing wick for a loss", () => {
    const bars = [...top, ...mk([[12.2, 15.5, 12, 15]], top.at(-1)!.time + H)];
    const r = simulate([{ spec: spec("X"), bars }], [], 2500);
    expect(r.trades[0]!.reason).toBe("sl");
    expect(r.trades[0]!.exitPrice).toBe(15);
    expect(r.trades[0]!.pnl).toBeCloseTo(-2.8);
  });
  it("allows max 2 open trades and drops the third signal (no queue)", () => {
    const r = simulate([{ spec: spec("A"), bars: top }, { spec: spec("B"), bars: top }, { spec: spec("C"), bars: top }], [], 2500);
    expect(r.trades).toHaveLength(2);
    expect(r.dropped).toHaveLength(1);
  });
  it("blocks entries inside the news window", () => {
    const r = simulate([{ spec: spec("A"), bars: top }], [top.at(-1)!.time + H + 30 * 60], 2500);
    expect(r.trades).toHaveLength(0);
  });
  it("Friday cutoff starts at 20:00 UTC", () => {
    expect(isFridayCutoff(Date.UTC(2026, 10, 27, 19, 59) / 1000)).toBe(false);
    expect(isFridayCutoff(Date.UTC(2026, 10, 27, 20, 0) / 1000)).toBe(true);
  });
});
