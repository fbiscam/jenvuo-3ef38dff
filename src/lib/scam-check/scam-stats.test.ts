import { describe, it } from "node:test";
import { expect } from "../chart/test-expect";
import { buildReport, dayTrend, fillDays } from "./scam-stats";

const today = new Date("2026-11-26T12:00:00Z");

describe("scam report", () => {
  it("has one slider entry for each of the last 30 days", () => {
    const days = fillDays([], today);
    expect(days).toHaveLength(30);
    expect(days[29]?.day).toBe("2026-11-26");
    expect(days[0]?.day).toBe("2026-10-28");
  });

  it("monthly views add up real daily views only", () => {
    const r = buildReport(
      [
        { day: "2026-11-26", views: 10, scans: 0, flagged: 0, suspicious: 0 },
        { day: "2026-11-01", views: 5, scans: 0, flagged: 0, suspicious: 0 },
        { day: "2026-09-01", views: 999, scans: 0, flagged: 0, suspicious: 0 },
      ],
      today,
    );
    expect(r.monthlyViews).toBe(15);
  });

  it("shows no change figure until both weeks have scans", () => {
    const r = buildReport([{ day: "2026-11-26", views: 0, scans: 4, flagged: 1, suspicious: 1 }], today);
    expect(r.flaggedShare).toBe(50);
    expect(r.flaggedShareChange).toBeNull();
  });

  it("change compares last 7 days with the 7 before", () => {
    const r = buildReport(
      [
        { day: "2026-11-25", views: 0, scans: 10, flagged: 2, suspicious: 0 }, // 20%
        { day: "2026-11-15", views: 0, scans: 10, flagged: 4, suspicious: 0 }, // 40%
      ],
      today,
    );
    expect(r.flaggedShareChange).toBe(-20);
  });

  it("day trend compares with the day before", () => {
    const days = fillDays(
      [
        { day: "2026-11-25", views: 0, scans: 5, flagged: 3, suspicious: 0 },
        { day: "2026-11-26", views: 0, scans: 5, flagged: 1, suspicious: 0 },
      ],
      today,
    );
    expect(dayTrend(days, 29)).toBe("down");
    expect(dayTrend(days, 0)).toBe("none");
  });
});
