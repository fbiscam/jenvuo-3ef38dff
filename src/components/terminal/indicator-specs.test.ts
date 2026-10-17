import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildIndicatorSeries, renderedIndicatorIds, type IndicatorId } from "./indicator-specs";

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