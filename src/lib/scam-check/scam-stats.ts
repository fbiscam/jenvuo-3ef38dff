/** Pure rules for the public Scam Protection report (tested). */

export type ScamDay = {
  day: string; // YYYY-MM-DD (UTC)
  views: number;
  scans: number;
  flagged: number;
  suspicious: number;
};

export type ScamReport = {
  days: ScamDay[];
  monthlyViews: number;
  monthlyScans: number;
  monthlyFlagged: number;
  /** % of scans flagged as scam or suspicious in the last 30 days, null without scans. */
  flaggedShare: number | null;
  /** Change (percentage points) in flagged share: last 7 days vs the 7 days before. Negative = fewer scams found. */
  flaggedShareChange: number | null;
};

export const REPORT_DAYS = 30;

function isoDay(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Fill gaps so the slider always has one entry per day, oldest first. */
export function fillDays(rows: ScamDay[], today: Date, count = REPORT_DAYS): ScamDay[] {
  const byDay = new Map(rows.map((r) => [r.day, r]));
  const out: ScamDay[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - i));
    const key = isoDay(d);
    out.push(byDay.get(key) ?? { day: key, views: 0, scans: 0, flagged: 0, suspicious: 0 });
  }
  return out;
}

function share(days: ScamDay[]): number | null {
  const scans = days.reduce((a, d) => a + d.scans, 0);
  if (scans === 0) return null;
  const bad = days.reduce((a, d) => a + d.flagged + d.suspicious, 0);
  return (bad / scans) * 100;
}

export function buildReport(rows: ScamDay[], today: Date): ScamReport {
  const days = fillDays(rows, today);
  const last7 = days.slice(-7);
  const prev7 = days.slice(-14, -7);
  const a = share(last7);
  const b = share(prev7);
  const s = share(days);
  return {
    days,
    monthlyViews: days.reduce((x, d) => x + d.views, 0),
    monthlyScans: days.reduce((x, d) => x + d.scans, 0),
    monthlyFlagged: days.reduce((x, d) => x + d.flagged, 0),
    flaggedShare: s === null ? null : Math.round(s * 10) / 10,
    flaggedShareChange: a === null || b === null ? null : Math.round((a - b) * 10) / 10,
  };
}

/** Day-over-day trend for one slider stop. */
export function dayTrend(days: ScamDay[], index: number): "up" | "down" | "flat" | "none" {
  const cur = days[index];
  const prev = days[index - 1];
  if (!cur || !prev) return "none";
  if (cur.scans === 0 && prev.scans === 0) return "none";
  const c = cur.flagged + cur.suspicious;
  const p = prev.flagged + prev.suspicious;
  return c > p ? "up" : c < p ? "down" : "flat";
}
