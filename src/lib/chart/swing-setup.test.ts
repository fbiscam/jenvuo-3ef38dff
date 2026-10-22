import { describe, expect, it } from "bun:test";
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
  return out; // ends around 100
}

describe("evaluateSwingSetup", () => {
  it("valid buy when path is clear, TP at least 2R", () => {
    const b = base();
    b.push(bar(20, 100, 99.5, 100.2, 97)); // swing low
    b.push(bar(21, 99.6, 101.5)); // confirmation close past body
    const s = evaluateSwingSetup(b, 20, "low");
    expect(s.status).toBe("valid");
    expect(s.rr! >= 2).toBe(true);
  });

  it("blocks buy when unmitigated bearish FVG sits before 2R", () => {
    const b = base();
    // bearish FVG around 103-105: a.l=106, mid strong down, c.h=103
    b.splice(10, 3, bar(10, 107, 106.5, 107.2, 106), bar(11, 106, 101, 106, 101), bar(12, 101, 100.5, 103, 100));
    for (let i = 13; i < 20; i++) b[i] = bar(i, 100.5, 100.2, 100.8, 99.9);
    b.push(bar(20, 100, 99.5, 100.2, 99));
    b.push(bar(21, 99.6, 101));
    const s = evaluateSwingSetup(b, 20, "low");
    expect(s.status).toBe("blocked");
  });

  it("waits without a closed confirmation", () => {
    const b = base();
    b.push(bar(20, 100, 99.5, 100.2, 97));
    b.push(bar(21, 99.5, 99.8));
    expect(evaluateSwingSetup(b, 20, "low").status).toBe("waiting");
  });
});
