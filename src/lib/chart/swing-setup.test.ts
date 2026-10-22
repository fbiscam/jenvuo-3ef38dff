import { describe, it } from "node:test";
import { expect } from "./test-expect";
import { evaluateSwingSetup } from "./swing-setup";

type C = { t: number; o: number; h: number; l: number; c: number };
const bar = (t: number, o: number, c: number, h = Math.max(o, c) + 0.5, l = Math.min(o, c) - 0.5): C => ({ t, o, h, l, c });

function base(): C[] {
  const out: C[] = [];
  let p = 120;
  for (let i = 0; i < 20; i++) {
    out.push(bar(i, p, p - 1));
    p -= 1;
  }
  return out;
}

describe("evaluateSwingSetup (Fresh High/Low Entry Finder)", () => {
  it("weak buy without FVG: TP between 1R and 1.5R", () => {
    const b = base();
    b.push(bar(20, 100, 99.5, 100.2, 97));
    b.push(bar(21, 99.6, 101.5));
    const s = evaluateSwingSetup(b, 20, "low");
    expect(s.status).toBe("valid");
    expect(s.grade).toBe("weak");
    expect(s.rr! >= 1 && s.rr! <= 1.5).toBe(true);
  });

  it("best buy with demand + bullish FVG: entry at FVG 50%, RR at least 3", () => {
    const b = base();
    b.push(bar(20, 100, 99.5, 100.2, 97));
    b.push(bar(21, 99.6, 104, 104.2, 99.5)); // displacement
    b.push(bar(22, 104, 105, 105.5, 101)); // gap 100.2..101
    const s = evaluateSwingSetup(b, 20, "low");
    expect(s.grade).toBe("best");
    expect(s.entry).toBe(100.6);
    expect(s.rr! >= 3).toBe(true);
  });

  it("WAIT when the previous leg's bearish FVG is unmitigated", () => {
    const b = base();
    b.splice(10, 3, bar(10, 107, 106.5, 107.2, 106), bar(11, 106, 101, 106, 101), bar(12, 101, 100.5, 103, 100));
    for (let i = 13; i < 20; i++) b[i] = bar(i, 100.5, 100.2, 100.8, 99.9);
    b.push(bar(20, 100, 99.5, 100.2, 99));
    b.push(bar(21, 99.6, 101));
    const s = evaluateSwingSetup(b, 20, "low");
    expect(s.status).toBe("waiting");
    expect(s.checklist?.supplyCleared).toBe(false);
  });

  it("ignores FVGs older than the immediate previous swing", () => {
    const b = base();
    b.splice(10, 3, bar(10, 107, 106.5, 107.2, 106), bar(11, 106, 101, 106, 101), bar(12, 101, 100.5, 103, 100));
    for (let i = 13; i < 20; i++) b[i] = bar(i, 100.5, 100.2, 100.8, 99.9);
    b.push(bar(20, 100, 99.5, 100.2, 99));
    b.push(bar(21, 99.6, 101));
    expect(evaluateSwingSetup(b, 20, "low", 15).status).toBe("valid");
  });

  it("waits without a closed break", () => {
    const b = base();
    b.push(bar(20, 100, 99.5, 100.2, 97));
    b.push(bar(21, 99.5, 99.8));
    expect(evaluateSwingSetup(b, 20, "low").status).toBe("waiting");
  });
});
