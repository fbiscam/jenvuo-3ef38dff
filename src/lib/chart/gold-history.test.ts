import { describe, it } from "node:test";
import { expect } from "./test-expect";
import { parseRssHeadlines, periodPerformance, seasonalSeries, type DailyClose } from "./gold-history";

const day = (y: number, m: number, d: number, c: number): DailyClose => ({ t: Date.UTC(y, m, d), c });

describe("periodPerformance", () => {
  const closes = [day(2025, 11, 31, 100), day(2026, 0, 2, 110), day(2026, 9, 18, 120), day(2026, 9, 19, 132)];
  const now = Date.UTC(2026, 9, 19, 12);

  it("1 day uses the previous daily close", () => {
    expect(periodPerformance(closes, now, 120)["1d"]).toBeCloseTo(10);
  });

  it("year to date is measured from the last close before 1 January", () => {
    expect(periodPerformance(closes, now)["ytd"]).toBeCloseTo(32);
  });

  it("all time is measured from the first close", () => {
    expect(periodPerformance(closes, now)["all"]).toBeCloseTo(32);
  });

  it("periods with no history before them stay empty", () => {
    expect(periodPerformance(closes, now)["5y"]).toBeNull();
  });
});

describe("seasonalSeries", () => {
  it("starts each year from the previous year's last close", () => {
    const [s] = seasonalSeries([day(2025, 11, 31, 100), day(2026, 0, 5, 105), day(2026, 1, 1, 90)], [2026]);
    expect(s.points[0]).toEqual([4, 5]);
    expect(s.last).toBeCloseTo(-10);
  });
});

describe("parseRssHeadlines", () => {
  it("splits the source off the title and drops non-http links", () => {
    const xml = `<rss><channel>
      <item><title>Gold edges up - Reuters</title><link>https://example.com/a</link><source url="x">Reuters</source><pubDate>Mon, 19 Oct 2026 10:00:00 GMT</pubDate></item>
      <item><title>Bad</title><link>javascript:alert(1)</link></item>
    </channel></rss>`;
    const out = parseRssHeadlines(xml);
    expect(out).toHaveLength(1);
    expect(out[0].title).toBe("Gold edges up");
    expect(out[0].source).toBe("Reuters");
    expect(out[0].link).toBe("https://example.com/a");
  });
});
