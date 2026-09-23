import { describeDrawing, type Drawing } from "@/lib/chart/drawings";
import { lastFinite, type OhlcvBar } from "@/lib/chart/indicators";
import type { ScriptResult } from "@/lib/chart/jenvu-script";
import type { SmcOverlay, SmcToggles } from "@/lib/chart/smc-overlay";
import { buildIndicatorSeries, type IndicatorId } from "./indicator-specs";

const fmt = (t: number) => new Date(t * 1000).toISOString().slice(0, 16).replace("T", " ") + "Z";

/**
 * Serializes exactly what the user sees on the Jenvu chart so the AI desk can
 * answer about drawings, indicators and scripts without guessing.
 */
export function buildChartContext(input: {
  timeframeLabel: string;
  bars: OhlcvBar[];
  stepSeconds: number;
  source: string;
  indicators: IndicatorId[];
  smc: SmcOverlay | null;
  smcToggles: SmcToggles;
  drawings: Drawing[];
  drawingsVisible: boolean;
  selectedId: string | null;
  scripts: Array<{ name: string; result?: ScriptResult; error?: string }>;
  visible: { from: number; to: number; lo: number; hi: number } | null;
  /** Server clock (ms) so forming-candle detection matches the SMC overlay. */
  now?: number;
}): string {
  const { bars } = input;
  if (!bars.length) return "";
  const last = bars[bars.length - 1];
  const forming = (last.time + input.stepSeconds) * 1000 > (input.now ?? Date.now());
  const lines: string[] = [];
  lines.push(
    `Chart: XAU/USD ${input.timeframeLabel} on the Jenvu chart (${bars.length} bars loaded, feed: ${input.source}).`,
  );
  lines.push(
    `Latest candle ${fmt(last.time)}${forming ? " (still forming)" : ""}: O ${last.open.toFixed(2)} H ${last.high.toFixed(2)} L ${last.low.toFixed(2)} C ${last.close.toFixed(2)}.`,
  );
  if (input.visible)
    lines.push(
      `Visible on screen: ${fmt(input.visible.from)} → ${fmt(input.visible.to)}, price range ${input.visible.lo.toFixed(2)}–${input.visible.hi.toFixed(2)}.`,
    );

  if (input.indicators.length) {
    const parts: string[] = [];
    for (const id of input.indicators) {
      if (id === "volume") continue;
      const spec = buildIndicatorSeries(id);
      const values = spec.compute(bars);
      const readings = spec.lines
        .map((l, i) => {
          const v = lastFinite(values[i]);
          return v == null ? null : `${l.title} ${v.toFixed(2)}`;
        })
        .filter(Boolean);
      if (readings.length) parts.push(readings.join(", "));
    }
    if (input.indicators.includes("volume")) parts.push(`Volume (last bar) ${last.volume.toFixed(0)}`);
    lines.push(`Indicators on chart: ${parts.join("; ") || "none"}.`);
  } else {
    lines.push("Indicators on chart: none.");
  }

  const on = Object.entries(input.smcToggles)
    .filter(([, v]) => v)
    .map(([k]) => k);
  lines.push(
    `Jenvu SMC overlays shown: ${on.length ? on.join(", ") : "none"} (drawn from the same verified engine as the market evidence; last 150 closed candles).`,
  );
  if (input.smc && on.length) {
    const recentPivots = input.smc.pivots
      .slice(-6)
      .map((p) => `${p.label} ${p.price.toFixed(2)} @ ${fmt(p.t / 1000)}`)
      .join(", ");
    if (recentPivots) lines.push(`Overlay swing labels visible (latest): ${recentPivots}.`);
  }

  const drawings = input.drawings.slice(-25);
  if (!input.drawingsVisible) {
    lines.push(`User drawings: ${input.drawings.length} saved but currently hidden.`);
  } else if (!drawings.length) {
    lines.push("User drawings: none on the chart.");
  } else {
    lines.push(`User drawings (${input.drawings.length}, oldest → newest; the last one is the most recent):`);
    drawings.forEach((d, i) => {
      const onScreen =
        input.visible && d.points.some((p) => p.t >= input.visible!.from && p.t <= input.visible!.to)
          ? " [on screen]"
          : "";
      const selected = d.id === input.selectedId ? " [SELECTED by user]" : "";
      lines.push(`${i + 1}. ${describeDrawing(d, bars)}${onScreen}${selected}`);
    });
  }

  const scripts = input.scripts.filter((s) => s.result || s.error);
  if (scripts.length) {
    lines.push("Jenvu Scripts (Pine-style) on the chart:");
    for (const s of scripts) {
      if (s.error) {
        lines.push(`- "${s.name}": error — ${s.error}`);
        continue;
      }
      const r = s.result!;
      const vars = Object.entries(r.variables)
        .filter(([, v]) => v != null)
        .slice(0, 10)
        .map(([k, v]) => `${k}=${Number(v).toFixed(2)}`)
        .join(", ");
      const signals = r.shapes
        .map((sh) => {
          const lastBar = sh.bars.at(-1);
          return lastBar == null ? `${sh.title}: never fired` : `${sh.title} last fired ${fmt(bars[lastBar].time)}`;
        })
        .join("; ");
      lines.push(
        `- "${r.name}"${r.overlay ? "" : " (own panel)"}: ${vars || "no numeric values"}${signals ? ` | signals: ${signals}` : ""}`,
      );
    }
  }
  return lines.join("\n").slice(0, 7800);
}
