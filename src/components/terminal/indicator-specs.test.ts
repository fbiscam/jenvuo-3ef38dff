import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildIndicatorSeries, renderedIndicatorIds, isIndicatorId, type IndicatorId } from "./indicator-specs";

const seriesLayout = (ids: IndicatorId[]) => renderedIndicatorIds(ids).flatMap((id) =>
  buildIndicatorSeries(id).lines.map((line) => line.title),
);

describe("rendered indicator series layout", () => {
  it("keeps default RVOL and EMA update slots aligned and starts scripts at slot 4", () => {
    const ids: IndicatorId[] = ["volume", "rvol", "ema20", "ema50"];
    assert.deepEqual(seriesLayout(ids), ["Volume", "MA 20", "EMA 20", "EMA 50"]);
    assert.equal(renderedIndicatorIds(ids).reduce((n, id) => n + buildIndicatorSeries(id).lines.length, 0), 4);
    assert.deepEqual(ids, ["volume", "rvol", "ema20", "ema50"]);
  });

  it("suppresses plain Volume regardless of its position in a saved setup", () => {
    assert.deepEqual(seriesLayout(["ema50", "rvol", "volume", "ema20"]),
      ["EMA 50", "Volume", "MA 20", "EMA 20"]);
  });

  it("restores the plain Volume slot when RVOL is turned off", () => {
    assert.deepEqual(seriesLayout(["volume", "ema20", "ema50"]), ["Volume", "EMA 20", "EMA 50"]);
  });

  it("preserves multi-line indicators, RVOL alone, and scripts without indicators", () => {
    assert.deepEqual(seriesLayout(["rvol", "macd"]), ["Volume", "MA 20", "Histogram", "MACD", "Signal"]);
    assert.deepEqual(seriesLayout([]), []);
  });
});

describe("expanded technical indicators", () => {
  const bars = Array.from({ length: 240 }, (_, i) => ({ time: i * 3600, open: i + 99, high: i + 102, low: i + 98, close: i + 100, volume: 1000 }));
  it("computes all new indicators with aligned, finite outputs after warmup", () => {
    for (const id of ["sma50", "sma200", "wma20", "donchian", "stochastic", "roc"] as const) {
      assert.equal(isIndicatorId(id), true);
      const spec = buildIndicatorSeries(id);
      const values = spec.compute(bars);
      assert.equal(values.length, spec.lines.length);
      for (const line of values) {
        assert.equal(line.length, 240);
        assert.equal(Number.isFinite(line.at(-1)), true);
      }
    }
  });
  it("uses a 20-bar Donchian window without future candles", () => {
    const values = buildIndicatorSeries("donchian").compute(bars);
    assert.equal(values[0]?.[19], 121);
    assert.equal(values[1]?.[19], 109.5);
    assert.equal(values[2]?.[19], 98);
    assert.equal(Number.isNaN(values[0]?.[18]), true);
  });
  it("uses nine bars for rate of change and avoids zero-price division", () => {
    assert.equal(buildIndicatorSeries("roc").compute(bars)[0]?.[9], 9);
    assert.equal(Number.isNaN(buildIndicatorSeries("roc").compute(bars.map((b) => ({ ...b, close: 0 })))[0]?.[9]), true);
  });
  it("keeps flat-market stochastic neutral rather than dividing by zero", () => {
    const flat = bars.map((b) => ({ ...b, high: 100, low: 100, close: 100 }));
    assert.equal(buildIndicatorSeries("stochastic").compute(flat)[0]?.at(-1), 50);
    assert.equal(buildIndicatorSeries("stochastic").compute(flat)[1]?.at(-1), 50);
  });
});