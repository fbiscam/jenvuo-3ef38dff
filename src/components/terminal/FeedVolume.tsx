import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getTerminalChart } from "@/lib/gold-analysis.functions";
import type { ChartAsset } from "./terminal-assets";
import { dailyFeedVolume } from "./feed-volume";
import { cn } from "@/lib/utils";

export function useDailyMarket(asset: ChartAsset) {
  const fetchChart = useServerFn(getTerminalChart);
  return useQuery({
    queryKey: ["terminal-info-daily", asset],
    queryFn: () => fetchChart({ data: { timeframe: "1d", asset } }),
    staleTime: 5 * 60_000,
    refetchInterval: 5 * 60_000,
    refetchIntervalInBackground: false,
  });
}

const compactNumber = (v: number) => new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 2 }).format(v);

export function FeedVolumeDisplay({ volume, loading, compact = false }: {
  volume: ReturnType<typeof dailyFeedVolume>;
  loading: boolean;
  compact?: boolean;
}) {
  return (
    <div className={cn("min-w-0", compact && "w-[190px] shrink-0")} title="Daily feed volume compared with the previous 30 daily bars; not centralized market order flow.">
      <div className={cn("flex justify-between gap-3 text-muted-foreground", compact ? "text-[10px] leading-3" : "text-[12px]")}>
        <span>Volume{compact && <span className="ml-1 tabular-nums text-foreground">{volume ? compactNumber(volume.today) : "—"}</span>}</span>
        <span>{compact ? "Avg 30D" : "Avg. volume (30D)"}{compact && <span className="ml-1 tabular-nums text-foreground">{volume ? compactNumber(volume.avg) : "—"}</span>}</span>
      </div>
      {!compact && volume && <div className="mt-0.5 flex justify-between text-[14px] font-medium tabular-nums text-foreground"><span>{compactNumber(volume.today)}</span><span>{compactNumber(volume.avg)}</span></div>}
      {volume ? <div className={cn("flex h-[5px] gap-[2px]", compact ? "mt-1" : "mt-2")} aria-hidden="true">
        <span className="h-full min-w-[2px] rounded-l-full bg-terminal-volume" style={{ flexGrow: volume.today, flexBasis: 0 }} />
        <span className="h-full min-w-[2px] rounded-r-full bg-terminal-volume-average" style={{ flexGrow: volume.avg, flexBasis: 0 }} />
      </div> : <p className={cn("text-muted-foreground", compact ? "text-[9px] leading-3" : "mt-1 text-[12px]")}>{loading ? "Loading volume…" : "Volume unavailable"}</p>}
    </div>
  );
}

export function ToolbarFeedVolume({ asset }: { asset: ChartAsset }) {
  const daily = useDailyMarket(asset);
  return <div className="ml-auto hidden shrink-0 pl-3 xl:block" data-volume-asset={asset}><FeedVolumeDisplay volume={dailyFeedVolume(daily.data?.bars ?? [])} loading={daily.isPending} compact /></div>;
}