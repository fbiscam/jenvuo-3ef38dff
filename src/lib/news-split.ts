export type NewsEvent = {
  title: string;
  country: string;
  date: string; // ISO
  impact: "High" | "Medium" | "Low";
  forecast?: string;
  previous?: string;
  minutesUntil: number;
};

/** Every upcoming-news list in the product shows at most this many events. */
export const MAX_NEWS = 4;

/** How many already-released events the Terminal news panel lists. */
export const PREVIOUS_NEWS = 5;

/** Upcoming / released split used by the Terminal news panel (events sorted oldest first). */
export function splitNews(events: NewsEvent[], now: number): { upcoming: NewsEvent[]; previous: NewsEvent[] } {
  const upcoming = events.filter((e) => new Date(e.date).getTime() > now).slice(0, MAX_NEWS);
  const previous = events.filter((e) => new Date(e.date).getTime() <= now).slice(-PREVIOUS_NEWS).reverse();
  return { upcoming, previous };
}
