import { createFileRoute } from "@tanstack/react-router";
import { useDemoTrading } from "@/components/terminal/DemoTradingPanel";
import { TerminalOrderPanel } from "@/components/terminal/TerminalOrderPanel";
import { TerminalPositionsTable } from "@/components/terminal/TerminalPositionsTable";
import { TerminalSidePanel } from "@/components/terminal/TerminalSidePanel";

export const Route = createFileRoute("/zz-terminal-preview")({ component: P });
const bars = Array.from({ length: 260 }, (_, i) => { const c = 3950 + i * 0.25 + Math.sin(i / 5) * 6; return { time: i * 900, open: c - 1, high: c + 3, low: c - 3, close: c, volume: 100 }; });
function P() {
  const t = useDemoTrading(4012.5);
  return (
    <div className="flex h-screen bg-gc-console-bar p-2">
      <TerminalOrderPanel trading={t} price={4012.5} />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-gc-line bg-background lg:mb-2"><div className="flex-1 grid place-items-center text-gc-ink-muted">chart</div><TerminalPositionsTable trading={t} price={4012.5} /></div>
      <TerminalSidePanel trading={t} price={4012.5} bars={bars} timeframeKey="15m" onClose={() => {}} />
    </div>
  );
}
