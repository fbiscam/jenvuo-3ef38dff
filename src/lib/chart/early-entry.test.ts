import { describe, it } from "node:test";
import { expect } from "./test-expect";
import { computeEarlyEntry } from "./early-entry";

const flat = (n: number, base = 100) =>
  Array.from({ length: n }, (_, i) => ({ t: i * 3600_000, o: base, h: base + 1, l: base - 1, c: base + 0.2 }));

describe("early entry (candle 1 trigger)", () => {
  it("fires SELL on the candle right after a fresh high closes bearish below its midpoint", () => {
    const bars = flat(15);
    bars.push({ t: 15 * 3600_000, o: 100, h: 104, l: 99.5, c: 103 }); // candle 0
    bars.push({ t: 16 * 3600_000, o: 103, h: 103.5, l: 100.5, c: 101 }); // candle 1
    const e = computeEarlyEntry(bars);
    expect(e?.side).toBe("SELL");
    expect(e?.entry).toBe(101);
    expect(e?.triggerT).toBe(16 * 3600_000);
    expect(e!.sl).toBeGreaterThan(104);
  });
  it("does not fire when candle 1 makes a higher high", () => {
    const bars = flat(15);
    bars.push({ t: 15 * 3600_000, o: 100, h: 104, l: 99.5, c: 103 });
    bars.push({ t: 16 * 3600_000, o: 103, h: 104.5, l: 100.5, c: 101 });
    expect(computeEarlyEntry(bars)?.t === 15 * 3600_000).toBe(false);
  });
  it("drops the trigger once a later wick hits SL", () => {
    const bars = flat(15);
    bars.push({ t: 15 * 3600_000, o: 100, h: 104, l: 99.5, c: 103 });
    bars.push({ t: 16 * 3600_000, o: 103, h: 103.5, l: 100.5, c: 101 });
    bars.push({ t: 17 * 3600_000, o: 101, h: 106, l: 100.8, c: 105 });
    expect(computeEarlyEntry(bars)).toBeNull();
  });
});
