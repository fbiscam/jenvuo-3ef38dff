/** Founding Program seats: a fixed number per calendar month (UTC), reopening on the 1st. */
export const FOUNDING_SEATS_PER_MONTH = 100;

/** When seats open again: 00:00 UTC on the 1st of the next month. */
export function nextSeatOpening(now: Date = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
}

/** "Dec 1, 2026, 00:00 UTC" */
export function formatSeatOpening(d: Date): string {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mm = String(d.getUTCMinutes()).padStart(2, "0");
  return `${months[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}, ${hh}:${mm} UTC`;
}

export function seatsFullMessage(now: Date = new Date()): string {
  return `All seats for this month are full. Seats open again on ${formatSeatOpening(nextSeatOpening(now))}.`;
}
