import type { ISeriesPrimitive, IPrimitivePaneRenderer, Time } from "lightweight-charts";

const DAY = 86400;

/** Display boundaries only: never re-bucket or modify market candles. */
export function dayGridBoundaries(from: number, to: number, sundayBreak: boolean): number[] {
  const result: number[] = [];
  for (let day = Math.floor(from / DAY) * DAY; day <= to; day += DAY) {
    const weekday = new Date(day * 1000).getUTCDay();
    if (!sundayBreak || (weekday !== 0 && weekday !== 6)) {
      if (day >= from) result.push(day);
    }
    const reopen = day + 17 * 3600;
    if (sundayBreak && weekday === 0 && reopen >= from && reopen <= to) result.push(reopen);
  }
  return result;
}

/** A bottom-layer primitive keeps wide daily grid lines behind candles/indicators. */
export function createDayGrid(color: string, sundayBreak: boolean): ISeriesPrimitive<Time> {
  let attachment: Parameters<NonNullable<ISeriesPrimitive<Time>["attached"]>>[0] | null = null;
  const renderer: IPrimitivePaneRenderer = {
    draw(target) {
      if (!attachment) return;
      const scale = attachment.chart.timeScale();
      const range = scale.getVisibleRange();
      if (!range || typeof range.from !== "number" || typeof range.to !== "number") return;
      const boundaries = dayGridBoundaries(range.from, range.to, sundayBreak);
      target.useMediaCoordinateSpace(({ context, mediaSize }) => {
        context.strokeStyle = color;
        context.lineWidth = 1;
        context.beginPath();
        let previousX = -Infinity;
        for (const time of boundaries) {
          const index = scale.timeToIndex(time as Time, true);
          const x = scale.timeToCoordinate(time as Time) ?? (index == null ? null : scale.logicalToCoordinate(index as never));
          if (x == null || x - previousX < 48) continue;
          previousX = x;
          const crispX = Math.round(x) + 0.5;
          context.moveTo(crispX, 0);
          context.lineTo(crispX, mediaSize.height);
        }
        context.stroke();
      });
    },
  };
  const view = { zOrder: () => "bottom" as const, renderer: () => renderer };
  return {
    attached(params) { attachment = params; params.requestUpdate(); },
    detached() { attachment = null; },
    paneViews: () => [view],
  };
}