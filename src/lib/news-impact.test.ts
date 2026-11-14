import { describe, it } from "node:test";
import { expect } from "./chart/test-expect";
import { fiveMinReaction, hourReaction, lastReleases, moveStats, signalFrom, surpriseOf, usdRead, whatIf, type Release } from "./news-impact";

const T = Date.UTC(2026, 10, 6, 13, 30);
const five = (moves: number[]) => moves.map((c, i) => ({ t: T + i * 300_000, o: i === 0 ? 100 : 100 + moves[i - 1], h: 100 + c + 1, l: 100 + c - 1, c: 100 + c }));
const rel = (id: string, actual: number, forecast: number, t15: number): Release => ({
  id, event_key: "nfp", released_at: new Date(T - Number(id) * 30 * 86400000).toISOString(), actual, forecast, previous: null,
  reactions: { gold: { base: 100, t5: t15, t15, t60: t15, hi: 5, lo: -5 } },
});

describe("news impact", () => {
  it("measures T+5, T+15 and T+60 from the release candle open", () => {
    const r = fiveMinReaction(five([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]), T)!;
    expect(r.t5).toBe(1);
    expect(r.t15).toBe(3);
    expect(r.t60).toBe(12);
  });
  it("needs a full hour of 5m candles", () => {
    expect(fiveMinReaction(five([1, 2, 3]), T)).toBeNull();
  });
  it("hourly reaction uses the last close before and the close an hour after", () => {
    const H = 3_600_000;
    const bars = [0, 1, 2, 3].map((i) => ({ t: Date.UTC(2026, 10, 6, 11) + i * H, o: 0, h: 0, l: 0, c: 10 + i }));
    expect(hourReaction(bars, T)?.h1).toBe(2); // 12:00 close 11 -> 14:00 close 13
  });
  it("surprise is actual minus forecast; FOMC falls back to the previous rate", () => {
    expect(surpriseOf({ event_key: "nfp", actual: 165, forecast: 65, previous: 60 })).toBe(100);
    expect(surpriseOf({ event_key: "fomc", actual: 4, forecast: null, previous: 3.75 })).toBe(0.25);
    expect(surpriseOf({ event_key: "nfp", actual: 165, forecast: null, previous: 60 })).toBeNull();
  });
  it("a beat is USD-positive, a miss USD-negative", () => {
    expect(usdRead("nfp", 50)).toBe(1);
    expect(usdRead("cpi", -0.1)).toBe(-1);
    expect(usdRead("nfp", 0)).toBe(0);
  });
  it("signal: 70% one way is strong, 60% a lean, under 5 samples no data", () => {
    expect(signalFrom({ n: 10, upPct: 70, downPct: 30 })).toBe("STRONG BUY");
    expect(signalFrom({ n: 10, upPct: 35, downPct: 65 })).toBe("SELL");
    expect(signalFrom({ n: 10, upPct: 50, downPct: 50 })).toBe("NEUTRAL VOLATILE");
    expect(signalFrom({ n: 4, upPct: 100, downPct: 0 })).toBe("NO DATA");
  });
  it("what-if uses only past releases with the same USD read", () => {
    const list = [rel("1", 200, 100, -3), rel("2", 180, 100, -2), rel("3", 150, 100, -4), rel("4", 120, 100, -1), rel("5", 300, 100, 2), rel("6", 50, 100, 5)];
    const w = whatIf(list, "nfp", 100, 160);
    expect(w.stats.n).toBe(5);
    expect(w.stats.downPct).toBe(80);
    expect(w.signal).toBe("STRONG SELL");
  });
  it("keeps the newest 24 released results only", () => {
    const list = Array.from({ length: 30 }, (_, i) => rel(String(i + 1), 1, 1, 0));
    expect(lastReleases(list, "nfp", T)).toHaveLength(24);
    expect(moveStats([]).n).toBe(0);
  });
});
