import { describe, it } from "node:test";
import { expect } from "./chart/test-expect";
import { dashboardZoomFor, opsInnerZoomFor, parseOpsZoom } from "./ops-zoom";

describe("ops console sizing", () => {
  it("shell uses the dashboard scale", () => {
    expect(dashboardZoomFor(1440)).toBe(1.099);
    expect(dashboardZoomFor(1920)).toBe(1.482);
    expect(dashboardZoomFor(800)).toBe(1);
  });

  it("embedded tool pages are larger than the dashboard at the same screen width", () => {
    for (const w of [1280, 1440, 1536, 1680, 1920]) {
      expect(opsInnerZoomFor(w) > dashboardZoomFor(w)).toBe(true);
    }
    expect(opsInnerZoomFor(1440)).toBe(1.231);
  });

  it("phones keep normal size", () => {
    expect(opsInnerZoomFor(390)).toBe(1);
  });

  it("rejects bad zoom values", () => {
    expect(parseOpsZoom("abc")).toBe(null);
    expect(parseOpsZoom("5")).toBe(null);
    expect(parseOpsZoom("1.2")).toBe(1.2);
  });
});
