/** Only future, unreleased high-impact events belong on the News page. */
export function isUpcomingHighImpact(event: { date: string; impact: string; actual?: number | null }, now: number): boolean {
  return event.impact === "High" && event.actual == null && Date.parse(event.date) > now;
}