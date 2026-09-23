import { describe, expect, it } from "vitest";
import { runJenvuScript, SCRIPT_TEMPLATES, ScriptError } from "./jenvu-script";
import { ema, rsi, sma } from "./indicators";
import type { OhlcvBar } from "./indicators";

function makeBars(closes: number[]): OhlcvBar[] {
  return closes.map((c, i) => ({
    time: 1_700_000_000 + i * 1800,
    open: i ? closes[i - 1] : c,
    high: Math.max(c, i ? closes[i - 1] : c) + 1,
    low: Math.min(c, i ? closes[i - 1] : c) - 1,
    close: c,
    volume: 100 + i,
  }));
}

const wave = Array.from({ length: 120 }, (_, i) => 2000 + Math.sin(i / 6) * 20 + i * 0.2);

describe("indicators", () => {
  it("computes SMA and EMA with correct warm-up", () => {
    const s = sma([1, 2, 3, 4, 5], 3);
    expect(Number.isNaN(s[1])).toBe(true);
    expect(s[2]).toBe(2);
    expect(s[4]).toBe(4);
    const e = ema([1, 2, 3, 4, 5], 3);
    expect(e[2]).toBe(2);
    expect(e[3]).toBeCloseTo(3);
  });

  it("keeps RSI inside 0-100", () => {
    const r = rsi(wave, 14).filter(Number.isFinite);
    expect(r.length).toBeGreaterThan(90);
    expect(Math.min(...r)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...r)).toBeLessThanOrEqual(100);
  });
});

describe("Jenvu Script", () => {
  const bars = makeBars(wave);

  it("runs a Pine v5 style EMA cross with named args", () => {
    const res = runJenvuScript(SCRIPT_TEMPLATES[0].source, bars);
    expect(res.name).toBe("EMA Cross");
    expect(res.overlay).toBe(true);
    expect(res.plots).toHaveLength(2);
    expect(res.plots[0].values.at(-1)).toBeCloseTo(ema(wave, 9).at(-1)!);
    expect(res.shapes).toHaveLength(2);
    expect(res.shapes[0].location).toBe("below");
    expect(res.shapes[0].bars.length + res.shapes[1].bars.length).toBeGreaterThan(0);
    expect(res.variables.fast).toBeCloseTo(ema(wave, 9).at(-1)!);
  });

  it("supports history references, ternaries, na and hline", () => {
    const res = runJenvuScript(
      `indicator("t", overlay=false)
x = close > close[1] ? 1 : 0
y = x == 1 ? high : na
plot(y, "y")
hline(50, "mid", color=color.gray)`,
      bars,
    );
    expect(res.overlay).toBe(false);
    expect(res.hlines[0].price).toBe(50);
    const y = res.plots[0].values;
    expect(y.some(Number.isNaN)).toBe(true);
    expect(y.some(Number.isFinite)).toBe(true);
  });

  it("all templates run without errors", () => {
    for (const t of SCRIPT_TEMPLATES) expect(() => runJenvuScript(t.source, bars)).not.toThrow();
  });

  it("detects inside bars exactly", () => {
    const b: OhlcvBar[] = [
      { time: 1, open: 10, high: 20, low: 5, close: 15, volume: 1 },
      { time: 2, open: 14, high: 18, low: 8, close: 12, volume: 1 },
      { time: 3, open: 12, high: 25, low: 7, close: 22, volume: 1 },
    ];
    const res = runJenvuScript(SCRIPT_TEMPLATES[1].source, b);
    expect(res.shapes[0].bars).toEqual([1]);
  });

  it("reports errors with line numbers and never evaluates JS", () => {
    expect(() => runJenvuScript(`a = 1\nb = foo(close)`, bars)).toThrow(/Line 2/);
    expect(() => runJenvuScript(`if close > open\n  plot(close)`, bars)).toThrow(ScriptError);
    expect(() => runJenvuScript(`window.alert(1)`, bars)).toThrow(/Unknown function/);
  });

  it("matches the built-in SMA", () => {
    const res = runJenvuScript(`plot(ta.sma(close, 20))`, bars);
    expect(res.plots[0].values.at(-1)).toBeCloseTo(sma(wave, 20).at(-1)!);
  });
});
