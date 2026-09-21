import { strict as assert } from "node:assert";
import { test } from "node:test";

import {
  buildQuantEvidence,
  buildTradeManagement,
  classifyVolume,
  computeAtr,
  detectMotherInsideBar,
  resolveDrawOnLiquidity,
  type QuantCandle,
} from "./quant-evidence";

function candle(
  t: number,
  o: number,
  h: number,
  l: number,
  c: number,
  v = 1000,
): QuantCandle {
  return { t, o, h, l, c, v };
}

function baseSeries(): QuantCandle[] {
  const out: QuantCandle[] = [];
  let price = 2000;
  for (let i = 0; i < 30; i++) {
    const o = price;
    const c = price + (i % 2 === 0 ? 1 : -1);
    out.push(candle(i * 1800_000, o, Math.max(o, c) + 1, Math.min(o, c) - 1, c, 1000));
    price = c;
  }
  return out;
}

test("ATR is positive on a normal series", () => {
  assert.ok(computeAtr(baseSeries()) > 0);
});

test("volume classification splits institutional vs retail bars", () => {
  const series = baseSeries();
  series.push(candle(30 * 1800_000, 2000, 2010, 1995, 2008, 5000));
  series.push(candle(31 * 1800_000, 2008, 2009, 2006, 2007, 200));
  assert.equal(classifyVolume(series, series.length - 2), "HIGH_INSTITUTIONAL_ACTIVITY");
  assert.equal(classifyVolume(series, series.length - 1), "LOW_RETAIL_CHOP");
});

test("mother + inside bar is detected and produces 1:3 execution params", () => {
  const series = baseSeries();
  series.push(candle(30 * 1800_000, 2000, 2012, 1994, 2010, 5000)); // mother
  series.push(candle(31 * 1800_000, 2010, 2008, 2000, 2004, 200)); // inside
  const pattern = detectMotherInsideBar(series);
  assert.ok(pattern);
  assert.equal(pattern?.broken, false);

  const result = buildQuantEvidence({ candles: series, trendState: "BULLISH" });
  const exec = result.execution_params;
  assert.ok(exec);
  assert.equal(exec?.signal, "BUY_STOP");
  assert.ok((exec?.trigger_price ?? 0) > 2008);
  assert.ok((exec?.dynamic_sl ?? 0) < 1994);
  const risk = (exec?.trigger_price ?? 0) - (exec?.dynamic_sl ?? 0);
  assert.ok(
    Math.abs((exec?.take_profit_absolute ?? 0) - ((exec?.trigger_price ?? 0) + risk * 3)) < 0.05,
  );
  assert.equal(result.market_context.mother_bar_volume_status, "HIGH_INSTITUTIONAL_ACTIVITY");
  assert.equal(result.market_context.inside_bar_volume_status, "LOW_RETAIL_CHOP");
});

test("break-even trigger sits at 1R and trail activates at 1.5R", () => {
  const mgmt = buildTradeManagement("BUY", 2030.15, 2026.7, 3.45);
  assert.equal(mgmt.break_even_trigger_price, 2033.6);
  assert.equal(mgmt.trail_activation_price, 2035.32);
  assert.equal(mgmt.trail_distance, 3.45);
});

test("draw on liquidity picks the nearest unswept pool on the bias side", () => {
  const dol = resolveDrawOnLiquidity(
    2000,
    [
      { price_level: 2020, status: "UNSWEPT" },
      { price_level: 2040, status: "UNSWEPT" },
      { price_level: 1980, status: "UNSWEPT" },
      { price_level: 2010, status: "SWEPT" },
    ],
    "BUY",
  );
  assert.equal(dol.level, 2020);
  assert.equal(dol.side, "BUY_SIDE");
});

test("no pattern yields no execution parameters", () => {
  const result = buildQuantEvidence({ candles: baseSeries(), trendState: "SIDEWAYS" });
  assert.equal(result.execution_params, null);
  assert.ok(result.notes.length > 0);
});
