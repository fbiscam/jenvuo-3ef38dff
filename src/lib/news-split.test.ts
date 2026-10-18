import { test } from "node:test";
import { expect } from "./chart/test-expect";
import { splitNews, PREVIOUS_NEWS, MAX_NEWS, type NewsEvent } from "./news-split";

const ev = (h: number): NewsEvent => ({ title: `E${h}`, country: "USD", date: new Date(Date.UTC(2026, 9, 20, h)).toISOString(), impact: "High", minutesUntil: 0 });

test("news panel lists the 5 latest released events, newest first", () => {
  const now = Date.UTC(2026, 9, 20, 12, 30);
  const all = [1, 2, 3, 4, 5, 6, 7, 8, 13, 14].map(ev);
  const { previous } = splitNews(all, now);
  expect(PREVIOUS_NEWS).toBe(5);
  expect(previous.map((e) => e.title).join(",")).toBe("E8,E7,E6,E5,E4");
});

test("news panel upcoming list is capped at MAX_NEWS", () => {
  const now = Date.UTC(2026, 9, 20, 0, 30);
  const { upcoming } = splitNews([1, 2, 3, 4, 5, 6].map(ev), now);
  expect(upcoming.length).toBe(MAX_NEWS);
  expect(upcoming[0].title).toBe("E1");
});
