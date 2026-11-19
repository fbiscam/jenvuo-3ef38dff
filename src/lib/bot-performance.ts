/** Overview "JX Bot · last 30 days": one profit value per UTC day across every MT5 account. */
export type BotDayRow = { day: string; today_profit: number };
export type BotDay = { date: string; v: number };
export type BotPerformance = {
  days: BotDay[];
  total: number;
  winDays: number;
  lossDays: number;
  best: BotDay | null;
  worst: BotDay | null;
  hasData: boolean;
};

const round2 = (n: number) => Math.round(n * 100) / 100;

export function botPerformance(rows: BotDayRow[], nowMs: number, span = 30): BotPerformance {
  const map = new Map<string, number>();
  for (let i = span - 1; i >= 0; i--) map.set(new Date(nowMs - i * 86_400_000).toISOString().slice(0, 10), 0);
  let hasData = false;
  for (const r of rows) {
    if (!map.has(r.day)) continue;
    const v = Number(r.today_profit);
    if (!Number.isFinite(v)) continue;
    hasData = true;
    map.set(r.day, (map.get(r.day) ?? 0) + v);
  }
  const days = Array.from(map, ([date, v]) => ({ date, v: round2(v) }));
  const wins = days.filter((d) => d.v > 0);
  const losses = days.filter((d) => d.v < 0);
  return {
    days,
    total: round2(days.reduce((a, d) => a + d.v, 0)),
    winDays: wins.length,
    lossDays: losses.length,
    best: wins.length ? wins.reduce((a, d) => (d.v > a.v ? d : a)) : null,
    worst: losses.length ? losses.reduce((a, d) => (d.v < a.v ? d : a)) : null,
    hasData,
  };
}

/** Profit days are green, loss days red, flat days neutral. */
export function plTone(v: number): "up" | "down" | "flat" {
  return v > 0 ? "up" : v < 0 ? "down" : "flat";
}
