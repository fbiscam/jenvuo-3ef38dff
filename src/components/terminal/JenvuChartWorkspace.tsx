import {
  forwardRef,
  memo,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Activity,
  AlignJustify,
  ArrowUpRight,
  Camera,
  Circle,
  Code,
  Eye,
  EyeOff,
  Layers,
  Magnet,
  Maximize2,
  Minimize2,
  Minus,
  MousePointer2,
  MoveUpRight,
  RectangleHorizontal,
  RotateCcw,
  SeparatorVertical,
  Trash2,
  TrendingUp,
  Type,
  type LucideIcon,
} from "lucide-react";
import { getTerminalChart } from "@/lib/gold-analysis.functions";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { XauUsdLogo } from "./XauUsdLogo";
import { Menu } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { DRAWING_COLORS, TOOL_LABELS, type Drawing, type DrawingTool } from "@/lib/chart/drawings";
import type { OhlcvBar } from "@/lib/chart/indicators";
import { runJenvuScript, type ScriptResult } from "@/lib/chart/jenvu-script";
import { computeSmcOverlay, DEFAULT_SMC, type SmcToggles } from "@/lib/chart/smc-overlay";
import { projectNextCandles } from "@/lib/chart/projection";
import { ChartCanvas, type ChartCanvasHandle } from "./ChartCanvas";
import { INDICATOR_LIST, buildIndicatorSeries, isIndicatorId, type IndicatorId } from "./indicator-specs";
import { ScriptPanel, type SavedScript } from "./ScriptPanel";
import { buildChartContext } from "./chart-context";
import { DemoTradingPanel } from "./DemoTradingPanel";
import type { DemoPosition } from "@/lib/chart/demo-trading";

const MemoChart = memo(ChartCanvas);

const DRAWINGS_KEY = "jenvu:terminal:drawings:v1";
const INDICATORS_KEY = "jenvu:terminal:indicators:v1";
const SMC_KEY = "jenvu:terminal:smc:v1";
const SCRIPTS_KEY = "jenvu:terminal:scripts:v1";
const DRAWINGS_VISIBLE_KEY = "jenvu:terminal:drawings-visible:v1";

function PositionToolIcon({ side }: { side: "long" | "short" }) {
  const isLong = side === "long";
  // TradingView-style position icon: two anchored target/stop rails, an
  // entry rail, and a clear "L" / "S" letter between them.
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="4.5" cy="4" r="2" />
      <path d="M6.5 4H21" />
      <circle cx="4.5" cy="20" r="2" />
      <path d="M6.5 20H21" />
      {isLong ? (
        <>
          <path d="M12 7.5v5h4" />
          <path d="M6 15.5h15" />
        </>
      ) : (
        <>
          <path d="M6 8.5h15" />
          <path d="M16 11.6c-.5-.7-1.3-1.1-2.2-1.1-1.2 0-2.1.6-2.1 1.5 0 2 4.5 1 4.5 3.1 0 .9-.9 1.6-2.2 1.6-1 0-1.9-.4-2.4-1.1" />
        </>
      )}
    </svg>
  );
}

export type TimeframeOption = { key: string; label: string };

export type JenvuChartHandle = {
  /** JPEG data URL of the chart including overlays and drawings. */
  snapshot: () => string | null;
  /** Exact text description of the chart state for the AI desk. */
  describe: () => string;
  hasDrawings: () => boolean;
};

type Props = {
  timeframes: TimeframeOption[];
  timeframe: TimeframeOption;
  onTimeframeChange: (tf: TimeframeOption) => void;
  rightSlot?: ReactNode;
};

const TOOLS: Array<{ id: DrawingTool; icon: LucideIcon; label: string }> = [
  { id: "cursor", icon: MousePointer2, label: "Cursor (Esc)" },
  { id: "trend", icon: TrendingUp, label: TOOL_LABELS.trend },
  { id: "ray", icon: MoveUpRight, label: TOOL_LABELS.ray },
  { id: "arrow", icon: ArrowUpRight, label: TOOL_LABELS.arrow },
  { id: "hline", icon: Minus, label: TOOL_LABELS.hline },
  { id: "vline", icon: SeparatorVertical, label: TOOL_LABELS.vline },
  { id: "rect", icon: RectangleHorizontal, label: TOOL_LABELS.rect },
  { id: "circle", icon: Circle, label: TOOL_LABELS.circle },
  { id: "fib", icon: AlignJustify, label: TOOL_LABELS.fib },
  { id: "text", icon: Type, label: TOOL_LABELS.text },
];

const SMC_LABELS: Array<{ key: keyof SmcToggles; label: string; hint: string }> = [
  { key: "structure", label: "Swing structure", hint: "HH / HL / LH / LL labels" },
  { key: "breaks", label: "BOS / CHoCH", hint: "Confirmed close-through breaks" },
  { key: "liquidity", label: "Liquidity", hint: "Nearest buy-side / sell-side pools" },
  { key: "fvg", label: "Fair value gaps", hint: "Unmitigated and partial FVGs" },
  { key: "orderBlocks", label: "Order blocks", hint: "Strict demand / supply blocks" },
];

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // The chart must remain usable when browser storage is full, disabled, or
    // restricted. The current in-memory setup remains active for this visit.
  }
}

function ToolButton({
  active,
  label,
  onClick,
  children,
  disabled,
}: {
  active?: boolean;
  label: string;
  onClick: () => void;
  children: ReactNode;
  disabled?: boolean;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={label}
          aria-pressed={active}
          disabled={disabled}
          onClick={onClick}
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-40",
            active && "bg-accent text-foreground ring-1 ring-border",
          )}
        >
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  );
}

export const JenvuChartWorkspace = forwardRef<JenvuChartHandle, Props>(function JenvuChartWorkspace(
  { timeframes, timeframe, onTimeframeChange, rightSlot },
  ref,
) {
  const fetchChart = useServerFn(getTerminalChart);
  const workspaceRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<ChartCanvasHandle | null>(null);
  const [ready, setReady] = useState(false);
  const [indicators, setIndicators] = useState<IndicatorId[]>(["volume", "ema20", "ema50"]);
  const [smcToggles, setSmcToggles] = useState<SmcToggles>(DEFAULT_SMC);
  const [drawings, setDrawings] = useState<Drawing[]>([]);
  const [drawingsVisible, setDrawingsVisible] = useState(true);
  const [scripts, setScripts] = useState<SavedScript[]>([]);
  const [scriptPanelOpen, setScriptPanelOpen] = useState(false);
  const [tool, setTool] = useState<DrawingTool>("cursor");
  const [color, setColor] = useState(DRAWING_COLORS[0]);
  const [magnet, setMagnet] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [demoPositions, setDemoPositions] = useState<DemoPosition[]>([]);

  useEffect(() => {
    const syncFullscreen = () => setFullscreen(document.fullscreenElement === workspaceRef.current);
    document.addEventListener("fullscreenchange", syncFullscreen);
    return () => document.removeEventListener("fullscreenchange", syncFullscreen);
  }, []);

  async function toggleFullscreen() {
    const workspace = workspaceRef.current;
    if (!workspace) return;
    if (document.fullscreenElement === workspace) {
      await document.exitFullscreen();
      return;
    }
    await workspace.requestFullscreen();
  }

  // Load saved chart state once. `ready` is React state (not a ref) so the
  // save effects below only run on the render AFTER saved values are applied —
  // otherwise the initial defaults overwrite the user's saved setup on mount
  // (and React StrictMode's double-mount then reads those defaults back).
  useEffect(() => {
    const savedDrawings = readJson<Drawing[]>(DRAWINGS_KEY, []);
    if (Array.isArray(savedDrawings)) setDrawings(savedDrawings.filter((d) => d && Array.isArray(d.points)));
    // `null` = never saved → keep defaults. An empty array means the user
    // removed every indicator on purpose, so respect it.
    const savedIndicators = readJson<unknown[] | null>(INDICATORS_KEY, null);
    if (Array.isArray(savedIndicators)) setIndicators(savedIndicators.filter(isIndicatorId));
    const savedSmc = readJson<Partial<SmcToggles> | null>(SMC_KEY, null);
    if (savedSmc && typeof savedSmc === "object") setSmcToggles({ ...DEFAULT_SMC, ...savedSmc });
    const savedScripts = readJson<SavedScript[]>(SCRIPTS_KEY, []);
    if (Array.isArray(savedScripts)) {
      // Mother/Son strategy: keep only the IB markers, drop the Mother high/low lines.
      const MOTHER_LINE_RE = /^\s*(motherHigh|motherLow)\s*=.*$|^\s*plot\((motherHigh|motherLow)\b.*$/;
      setScripts(
        savedScripts.map((s) =>
          typeof s?.source === "string" && /motherHigh|motherLow/.test(s.source)
            ? { ...s, source: s.source.split("\n").filter((l) => !MOTHER_LINE_RE.test(l)).join("\n") }
            : s,
        ),
      );
    }
    const savedVisible = readJson<boolean | null>(DRAWINGS_VISIBLE_KEY, null);
    if (typeof savedVisible === "boolean") setDrawingsVisible(savedVisible);
    setReady(true);
  }, []);

  useEffect(() => {
    if (ready) writeJson(DRAWINGS_KEY, drawings);
  }, [ready, drawings]);
  useEffect(() => {
    if (ready) writeJson(INDICATORS_KEY, indicators);
  }, [ready, indicators]);
  useEffect(() => {
    if (ready) writeJson(SMC_KEY, smcToggles);
  }, [ready, smcToggles]);
  useEffect(() => {
    if (ready) writeJson(SCRIPTS_KEY, scripts);
  }, [ready, scripts]);
  useEffect(() => {
    if (ready) writeJson(DRAWINGS_VISIBLE_KEY, drawingsVisible);
  }, [ready, drawingsVisible]);

  const chartQuery = useQuery({
    queryKey: ["terminal-chart", timeframe.key],
    queryFn: () => fetchChart({ data: { timeframe: timeframe.key } }),
    refetchInterval: 10000,
    refetchIntervalInBackground: true,
    staleTime: 3000,
    retry: 2,
  });

  const payload = chartQuery.data;
  const bars: OhlcvBar[] = useMemo(() => payload?.bars ?? [], [payload]);
  const stepSeconds = payload?.stepSeconds ?? 1800;
  const currentPrice = bars.at(-1)?.close ?? null;

  // Use the SERVER clock to decide which candles are closed. A device clock that
  // is a few minutes off would otherwise include/exclude a candle and shift the
  // HH/HL/LH/LL, BOS/CHoCH and liquidity labels between accounts.
  const serverTime = payload?.serverTime;
  const smc = useMemo(() => {
    if (bars.length < 10) return null;
    const now = serverTime ?? Date.now();
    const closed = bars.filter((b) => (b.time + stepSeconds) * 1000 <= now);
    const last = bars[bars.length - 1];
    const forming = closed.length < bars.length ? last : null;
    return computeSmcOverlay(closed, last.close, forming);
  }, [bars, stepSeconds, serverTime]);

  // Next-candle projection removed from the chart.
  const projection = useMemo(
    () => (false as boolean && smc ? projectNextCandles(bars, stepSeconds, smc.trend, smc.buySide, smc.sellSide, 4) : null),
    [bars, stepSeconds, smc],
  );

  const scriptRuns = useMemo(
    () =>
      scripts.map((s) => {
        if (!s.enabled || !bars.length) return { script: s, result: undefined, error: undefined };
        try {
          return { script: s, result: runJenvuScript(s.source, bars), error: undefined };
        } catch (err) {
          return { script: s, result: undefined, error: err instanceof Error ? err.message : String(err) };
        }
      }),
    [scripts, bars],
  );
  const chartScripts = useMemo(
    () =>
      scriptRuns
        .filter((r): r is typeof r & { result: ScriptResult } => Boolean(r.result))
        .map((r) => ({ id: r.script.id, result: r.result })),
    [scriptRuns],
  );

  const onToolDone = useCallback(() => setTool("cursor"), []);
  const onHoverBar = useCallback((i: number | null) => setHoverIndex(i == null ? null : Math.round(i)), []);

  const stateRef = useRef({ bars, stepSeconds, indicators, smc, smcToggles, drawings, drawingsVisible, selectedId, scriptRuns, timeframe, payload });
  stateRef.current = { bars, stepSeconds, indicators, smc, smcToggles, drawings, drawingsVisible, selectedId, scriptRuns, timeframe, payload };

  useImperativeHandle(ref, () => ({
    snapshot: () =>
      chartRef.current?.snapshot(
        `Jenvu chart · XAU/USD · ${stateRef.current.timeframe.label} · ${new Date().toISOString().slice(0, 16).replace("T", " ")}Z`,
      ) ?? null,
    describe: () => {
      const s = stateRef.current;
      return buildChartContext({
        timeframeLabel: s.timeframe.label,
        bars: s.bars,
        stepSeconds: s.stepSeconds,
        source:
          s.payload?.source === "spot"
            ? "spot XAU/USD"
            : `PAXG candles (${s.payload?.provider ?? "exchange"}) scaled to live XAU/USD spot`,
        indicators: s.indicators,
        smc: s.smc,
        smcToggles: s.smcToggles,
        drawings: s.drawings,
        drawingsVisible: s.drawingsVisible,
        selectedId: s.selectedId,
        scripts: s.scriptRuns
          .filter((r) => r.script.enabled)
          .map((r) => ({ name: r.script.name, result: r.result, error: r.error })),
        visible: chartRef.current?.visibleWindow() ?? null,
        now: s.payload?.serverTime,
      });
    },
    hasDrawings: () => stateRef.current.drawingsVisible && stateRef.current.drawings.length > 0,
  }));

  const hovered = hoverIndex != null && hoverIndex >= 0 && hoverIndex < bars.length ? bars[hoverIndex] : bars.at(-1);
  const prevBar = hovered ? bars[bars.indexOf(hovered) - 1] : undefined;
  const change = hovered && prevBar ? ((hovered.close - prevBar.close) / prevBar.close) * 100 : null;
  const hoveredIdx = hovered ? bars.indexOf(hovered) : -1;

  const legendIndicators = useMemo(
    () =>
      indicators
        .filter((id) => id !== "volume")
        .map((id) => {
          const spec = buildIndicatorSeries(id);
          return { spec, values: spec.compute(bars) };
        }),
    [indicators, bars],
  );

  function downloadSnapshot() {
    const url = chartRef.current?.snapshot(
      `Jenvu chart · XAU/USD · ${timeframe.label} · ${new Date().toISOString().slice(0, 16).replace("T", " ")}Z`,
    );
    if (!url) return;
    const a = document.createElement("a");
    a.href = url;
    a.download = `jenvu-xauusd-${timeframe.key}-${Date.now()}.jpg`;
    a.click();
  }

  const selected = drawings.find((d) => d.id === selectedId) ?? null;

  return (
    <div ref={workspaceRef} className="flex h-full min-h-0 w-full flex-col bg-background">
      {/* Top bar */}
      <div className="flex h-11 shrink-0 items-center gap-1 overflow-x-auto border-b border-border px-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:overflow-x-visible">
        <div className="mr-1 flex shrink-0 items-center gap-2 pl-1 pr-2">
          <button
            type="button"
            aria-label="Open menu"
            onClick={() => window.dispatchEvent(new Event("jenvu:open-mobile-nav"))}
            className="inline-flex h-7 w-7 items-center justify-center rounded-md text-foreground hover:bg-muted md:hidden"
          >
            <Menu className="h-4 w-4" />
          </button>
          <span className="hidden md:inline-flex"><XauUsdLogo size={22} /></span>
          <span className="text-sm font-semibold tracking-tight">{"\n"}</span>
        </div>
        <div className="flex shrink-0 items-center" role="group" aria-label="Chart timeframe">
          {timeframes.map((item) => (
            <button
              type="button"
              key={item.key}
              onClick={() => onTimeframeChange(item)}
              aria-pressed={item.key === timeframe.key}
              className={cn(
                "h-7 rounded-md px-2 font-mono text-xs font-semibold text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
                item.key === timeframe.key && "bg-accent text-foreground",
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
        <span className="mx-1 h-5 w-px shrink-0 bg-border" aria-hidden="true" />

        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="flex h-7 shrink-0 items-center gap-1.5 rounded-md px-2 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <Activity className="h-3.5 w-3.5" />
              Indicators
              {indicators.length > 0 && (
                <span className="rounded bg-secondary px-1 font-mono text-[10px]">{indicators.length}</span>
              )}
            </button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-80 p-2 font-sans subpixel-antialiased">
            <p className="px-2 pb-2 pt-1 text-sm font-bold text-foreground">Indicators</p>
            {INDICATOR_LIST.map((spec) => {
              const on = indicators.includes(spec.id);
              return (
                <label
                  key={spec.id}
                  className="flex cursor-pointer items-start gap-2.5 rounded-md px-2 py-2 hover:bg-accent"
                >
                  <Checkbox
                    checked={on}
                    onCheckedChange={(v) =>
                      setIndicators((cur) => (v ? [...cur.filter((x) => x !== spec.id), spec.id] : cur.filter((x) => x !== spec.id)))
                    }
                    className="mt-0.5 data-[state=checked]:border-home-accent data-[state=checked]:bg-home-accent data-[state=checked]:text-home-accent-foreground"
                  />
                  <span className="min-w-0">
                    <span className="block text-[15px] font-semibold leading-5 text-foreground">{spec.name}</span>
                    <span className="block text-xs font-medium leading-4 text-muted-foreground">{spec.description}</span>
                  </span>
                </label>
              );
            })}
          </PopoverContent>
        </Popover>

        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="flex h-7 shrink-0 items-center gap-1.5 rounded-md px-2 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <Layers className="h-3.5 w-3.5" />
              Jenvu SMC
            </button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-80 p-2 font-sans subpixel-antialiased">
            <p className="px-2 pb-1 pt-1 text-sm font-bold text-foreground">Smart-money overlays</p>
            <p className="px-2 pb-2 text-xs font-medium leading-4 text-muted-foreground">
              Same 10-bar structure engine the AI desk
            </p>
            {SMC_LABELS.map((item) => (
              <label
                key={item.key}
                className="flex cursor-pointer items-center justify-between gap-3 rounded-md px-2 py-2 hover:bg-accent"
              >
                <span>
                  <span className="block text-[15px] font-semibold leading-5 text-foreground">{item.label}</span>
                  <span className="block text-xs font-medium leading-4 text-muted-foreground">{item.hint}</span>
                </span>
                <Switch
                  checked={smcToggles[item.key] ?? DEFAULT_SMC[item.key]}
                  onCheckedChange={(v) => setSmcToggles((cur) => ({ ...cur, [item.key]: v }))}
                  className="data-[state=checked]:bg-home-accent"
                />
              </label>
            ))}
          </PopoverContent>
        </Popover>

        <button
          type="button"
          onClick={() => setScriptPanelOpen((v) => !v)}
          aria-pressed={scriptPanelOpen}
          className={cn(
            "flex h-7 shrink-0 items-center gap-1.5 rounded-md px-2 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground",
            scriptPanelOpen && "bg-accent text-foreground",
          )}
        >
          <Code className="h-3.5 w-3.5" />
          Jenvu Script
        </button>

        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={downloadSnapshot}
              aria-label="Download chart snapshot"
              className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <Camera className="h-3.5 w-3.5" />
            </button>
          </TooltipTrigger>
          <TooltipContent>Download chart snapshot</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={() => chartRef.current?.fit()}
              aria-label="Reset chart view"
              className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
          </TooltipTrigger>
          <TooltipContent>Reset view</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={() => void toggleFullscreen()}
              aria-label={fullscreen ? "Exit fullscreen chart" : "Fullscreen chart"}
              className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              {fullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
            </button>
          </TooltipTrigger>
          <TooltipContent>{fullscreen ? "Exit fullscreen" : "Fullscreen chart"}</TooltipContent>
        </Tooltip>

        <DemoTradingPanel currentPrice={currentPrice} onPositionsChange={setDemoPositions} />

        <div className="ml-auto flex shrink-0 items-center gap-2">{rightSlot}</div>
      </div>

      <div className="flex min-h-0 flex-1">
        {/* Drawing toolbar */}
        <nav
          aria-label="Drawing tools"
          className="flex w-11 shrink-0 flex-col items-center gap-0.5 overflow-y-auto border-r border-border py-1.5"
        >
          {TOOLS.map((t) => (
            <ToolButton key={t.id} label={t.label} active={tool === t.id} onClick={() => setTool(t.id)}>
              <t.icon className="h-4 w-4" />
            </ToolButton>
          ))}
          <ToolButton label={TOOL_LABELS.long} active={tool === "long"} onClick={() => setTool("long")}>
            <PositionToolIcon side="long" />
          </ToolButton>
          <ToolButton label={TOOL_LABELS.short} active={tool === "short"} onClick={() => setTool("short")}>
            <PositionToolIcon side="short" />
          </ToolButton>
          <span className="my-1 h-px w-6 bg-border" aria-hidden="true" />
          <Popover>
            <Tooltip>
              <TooltipTrigger asChild>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    aria-label="Drawing color"
                    className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-accent"
                  >
                    <span className="h-4 w-4 rounded-full ring-2 ring-background" style={{ background: selected?.color ?? color }} />
                  </button>
                </PopoverTrigger>
              </TooltipTrigger>
              <TooltipContent side="right">Drawing color</TooltipContent>
            </Tooltip>
            <PopoverContent side="right" className="flex w-auto gap-1.5 p-2">
              {DRAWING_COLORS.map((c) => (
                <button
                  type="button"
                  key={c}
                  aria-label={`Use color ${c}`}
                  onClick={() => {
                    setColor(c);
                    if (selectedId)
                      setDrawings((cur) => cur.map((d) => (d.id === selectedId ? { ...d, color: c } : d)));
                  }}
                  className={cn(
                    "h-6 w-6 rounded-full ring-offset-2 ring-offset-background",
                    (selected?.color ?? color) === c && "ring-2 ring-ring",
                  )}
                  style={{ background: c }}
                />
              ))}
            </PopoverContent>
          </Popover>
          <ToolButton label={magnet ? "Magnet on (snaps to OHLC)" : "Magnet off"} active={magnet} onClick={() => setMagnet((m) => !m)}>
            <Magnet className="h-4 w-4" />
          </ToolButton>
          <ToolButton
            label={drawingsVisible ? "Hide drawings" : "Show drawings"}
            active={!drawingsVisible}
            onClick={() => setDrawingsVisible((v) => !v)}
          >
            {drawingsVisible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
          </ToolButton>
          <ToolButton
            label={selected ? "Delete selected drawing (Del)" : "Remove all drawings"}
            disabled={!drawings.length}
            onClick={() => {
              if (selected) {
                setDrawings((cur) => cur.filter((d) => d.id !== selected.id));
                setSelectedId(null);
              } else if (window.confirm("Remove all drawings from the chart?")) {
                setDrawings([]);
              }
            }}
          >
            <Trash2 className="h-4 w-4" />
          </ToolButton>
        </nav>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <div className="relative min-h-0 flex-1">
            <MemoChart
              ref={chartRef}
              bars={bars}
              stepSeconds={stepSeconds}
              indicators={indicators}
              scripts={chartScripts}
              smc={smc}
              smcToggles={smcToggles}
              projection={projection}
              demoPositions={demoPositions}
              drawings={drawings}
              drawingsVisible={drawingsVisible}
              tool={tool}
              color={color}
              magnet={magnet}
              selectedId={selectedId}
              onSelect={setSelectedId}
              onDrawingsChange={setDrawings}
              onToolDone={onToolDone}
              onHoverBar={onHoverBar}
              resetKey={`${timeframe.key}:${payload ? "ready" : "loading"}`}
            />

            {/* Legend */}
            <div className="pointer-events-none absolute left-2 top-1.5 z-[3] max-w-[70%] space-y-0.5 font-mono text-[11px] leading-4">
              <div className="mb-2 flex flex-wrap items-center gap-x-2">
                {hovered && (
                  <>
                    <span>
                      O <b className={hovered.close >= hovered.open ? "text-[#089981]" : "text-[#f23645]"}>{hovered.open.toFixed(2)}</b>
                    </span>
                    <span>
                      H <b className={hovered.close >= hovered.open ? "text-[#089981]" : "text-[#f23645]"}>{hovered.high.toFixed(2)}</b>
                    </span>
                    <span>
                      L <b className={hovered.close >= hovered.open ? "text-[#089981]" : "text-[#f23645]"}>{hovered.low.toFixed(2)}</b>
                    </span>
                    <span>
                      C <b className={hovered.close >= hovered.open ? "text-[#089981]" : "text-[#f23645]"}>{hovered.close.toFixed(2)}</b>
                    </span>
                    {change != null && (
                      <span className={change >= 0 ? "text-[#089981]" : "text-[#f23645]"}>
                        {change >= 0 ? "+" : ""}
                        {change.toFixed(2)}%
                      </span>
                    )}
                  </>
                )}
              </div>
              {legendIndicators.map(({ spec, values }) => (
                <div key={spec.id} className="flex flex-wrap gap-x-2 text-muted-foreground">
                  <span>{spec.name}</span>
                  {spec.lines.map((l, i) => {
                    const v = hoveredIdx >= 0 ? values[i][hoveredIdx] : NaN;
                    return (
                      <span key={l.title} style={{ color: l.kind === "histogram" ? undefined : l.color }}>
                        {Number.isFinite(v) ? v.toFixed(2) : "—"}
                      </span>
                    );
                  })}
                </div>
              ))}
              {chartScripts.map((s) => (
                <div key={s.id} className="flex flex-wrap gap-x-2 text-muted-foreground">
                  <span>{s.result.name}</span>
                  {s.result.plots.map((p) => {
                    const v = hoveredIdx >= 0 ? p.values[hoveredIdx] : NaN;
                    return (
                      <span key={p.title} style={{ color: p.color }}>
                        {Number.isFinite(v) ? v.toFixed(2) : "—"}
                      </span>
                    );
                  })}
                </div>
              ))}
            </div>

            {tool !== "cursor" && (
              <div className="pointer-events-none absolute bottom-3 left-1/2 z-[3] -translate-x-1/2 rounded-full bg-foreground px-3 py-1 text-xs text-background">
                {tool === "hline" || tool === "vline" || tool === "text"
                  ? `Click to place the ${TOOL_LABELS[tool as Exclude<DrawingTool, "cursor">].toLowerCase()}`
                  : tool === "long" || tool === "short"
                    ? "Click the entry, then click the stop loss"
                    : `Click two points to draw the ${TOOL_LABELS[tool as Exclude<DrawingTool, "cursor">].toLowerCase()}`}{" "}
                · Esc to cancel
              </div>
            )}

            {chartQuery.isPending && (
              <div className="absolute inset-0 z-[4] flex items-center justify-center bg-background/70 text-sm text-muted-foreground">
                Loading XAU/USD {timeframe.label} candles…
              </div>
            )}
            {chartQuery.isError && !payload && (
              <div className="absolute inset-0 z-[4] flex flex-col items-center justify-center gap-2 bg-background text-sm">
                <p>The gold price feed is not responding right now.</p>
                <button
                  type="button"
                  className="rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:bg-accent"
                  onClick={() => void chartQuery.refetch()}
                >
                  Try again
                </button>
              </div>
            )}
          </div>

          {scriptPanelOpen && (
            <ScriptPanel
              scripts={scripts}
              runs={scriptRuns.map((r) => ({ id: r.script.id, result: r.result, error: r.error }))}
              onChange={setScripts}
              onClose={() => setScriptPanelOpen(false)}
            />
          )}
        </div>
      </div>
    </div>
  );
});
