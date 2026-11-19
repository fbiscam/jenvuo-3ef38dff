import { describe, it as test } from "node:test";
import { expect } from "./chart/test-expect";
import { botPerformance, plTone } from "./bot-performance";

const NOW = Date.parse("2026-11-19T06:00:00Z");

describe("JX Bot last 30 days", () => {
  test("covers exactly the last 30 UTC days ending today", () => {
    const p = botPerformance([], NOW);
    expect(p.days.length).toBe(30);
    expect(p.days[29].date).toBe("2026-11-19");
    expect(p.days[0].date).toBe("2026-10-21");
    expect(p.hasData).toBe(false);
  });
  test("adds every account's profit per day and ignores older days", () => {
    const p = botPerformance(
      [
        { day: "2026-11-18", today_profit: 12.5 },
        { day: "2026-11-18", today_profit: -2.5 },
        { day: "2026-11-17", today_profit: -4 },
        { day: "2026-10-01", today_profit: 999 },
      ],
      NOW,
    );
    expect(p.days.find((d) => d.date === "2026-11-18")?.v).toBe(10);
    expect(p.total).toBe(6);
    expect(p.winDays).toBe(1);
    expect(p.lossDays).toBe(1);
    expect(p.best?.date).toBe("2026-11-18");
    expect(p.worst?.v).toBe(-4);
  });
  test("profit is green, loss is red", () => {
    expect(plTone(3)).toBe("up");
    expect(plTone(-0.01)).toBe("down");
    expect(plTone(0)).toBe("flat");
  });
});
