import { describe, expect, test } from "bun:test";
import { classifySfp } from "./sfp-signal";

const base = (n: number) => Array.from({ length: n }, (_, k) => ({ t: k, o: 1.1, h: 1.101, l: 1.099, c: 1.1005 }));

describe("one-candle strong SFP", () => {
  test("high swept with long upper wick and low close = sell on that candle's close", () => {
    const bars = [...base(10), { t: 10, o: 1.1004, h: 1.1035, l: 1.0998, c: 1.1 }];
    expect(classifySfp(bars, 10)?.side).toBe("sell");
  });
  test("low swept with long lower wick and high close = buy", () => {
    const bars = [...base(10), { t: 10, o: 1.0996, h: 1.1002, l: 1.0965, c: 1.1 }];
    expect(classifySfp(bars, 10)?.side).toBe("buy");
  });
  test("closing above the swept high is not an SFP", () => {
    const bars = [...base(10), { t: 10, o: 1.1004, h: 1.1035, l: 1.0998, c: 1.1012 }];
    expect(classifySfp(bars, 10)).toBeNull();
  });
  test("big body with small wick is not an SFP", () => {
    const bars = [...base(10), { t: 10, o: 1.1025, h: 1.1035, l: 1.0995, c: 1.0997 }];
    expect(classifySfp(bars, 10)).toBeNull();
  });
});
