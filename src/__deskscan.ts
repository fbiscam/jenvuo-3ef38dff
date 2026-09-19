import { resolveInstrument, fetchInstrumentCandles, fetchLiveInstrumentTick } from "@/lib/gold-analysis.functions";
import { runExtensionDesk } from "@/lib/analysis/extension-desk";

const pairs = process.argv.slice(2);
for (const p of pairs) {
  try {
    const inst = resolveInstrument(p);
    const [m5, m15, h1, h4, d1] = await Promise.all([
      fetchInstrumentCandles(inst, "5m"),
      fetchInstrumentCandles(inst, "15m"),
      fetchInstrumentCandles(inst, "1h"),
      fetchInstrumentCandles(inst, "4h"),
      fetchInstrumentCandles(inst, "1d"),
    ]);
    const tick = await fetchLiveInstrumentTick(inst);
    const live = tick?.price ?? m15[m15.length - 1]?.c ?? 0;
    const res = runExtensionDesk({
      symbol: inst.display ?? p,
      timeframe: "15m",
      selected: m15,
      m5,
      h1,
      h4,
      d1,
      livePrice: live,
      kind: (inst as any).kind ?? "forex",
      decimals: (inst as any).decimals ?? 2,
    });
    console.log("==========", p, "candles", m5.length, m15.length, h1.length, h4.length, d1.length, "live", live);
    console.log(res.text);
  } catch (e) {
    console.log("ERR", p, (e as Error).message);
  }
}
