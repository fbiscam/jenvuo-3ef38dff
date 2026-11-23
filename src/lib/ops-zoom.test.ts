import { describe, it } from "node:test";
import { expect } from "./chart/test-expect";
import { dashboardZoomFor, opsShellZoomFor, opsInnerZoomFor, parseOpsZoom } from "./ops-zoom";

describe("ops console sizing", () => {
  it("shell uses the dashboard scale", () => {
    expect(dashboardZoomFor(1440)).toBe(1.099);
    expect(dashboardZoomFor(1920)).toBe(1.482);
    expect(dashboardZoomFor(800)).toBe(1);
  });

  it("embedded tools are 25% smaller than their previous scale", () => {
    for (const w of [1280, 1440, 1536, 1680, 1920]) {
      const previous = Math.round(dashboardZoomFor(w) * 1.12 * 1000) / 1000;
      expect(opsInnerZoomFor(w)).toBe(previous * 0.75);
    }
    expect(opsInnerZoomFor(1440)).toBe(1.231 * 0.75);
  });

  it("phones also shrink 25%", () => {
    expect(opsInnerZoomFor(390)).toBe(0.75);
  });

  it("shell shrinks exactly 25% at every screen width", () => {
    for (const w of [390, 800, 1024, 1280, 1440, 1536, 1680, 1920]) {
      expect(opsShellZoomFor(w)).toBe(dashboardZoomFor(w) * 0.75);
    }
  });

  it("rejects bad zoom values", () => {
    expect(parseOpsZoom("abc")).toBe(null);
    expect(parseOpsZoom("0.68175")).toBe(0.68175);
    expect(parseOpsZoom("0.49")).toBe(null);
    expect(parseOpsZoom("5")).toBe(null);
    expect(parseOpsZoom("1.2")).toBe(1.2);
  });
});
