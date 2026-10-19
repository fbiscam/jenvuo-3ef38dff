import { createFileRoute } from "@tanstack/react-router";
import { JenvuChartWorkspace } from "@/components/terminal/JenvuChartWorkspace";
import { TooltipProvider } from "@/components/ui/tooltip";

export const Route = createFileRoute("/zz-terminal-preview")({ component: P });
const TF = [{ key: "15m", label: "15m" }, { key: "1h", label: "1H" }];
function P() {
  return (
    <TooltipProvider>
      <div className="flex h-screen flex-col bg-background">
        <header className="flex h-[52px] items-center gap-3 border-b border-gc-line px-3"><span className="text-[20px] font-medium text-gc-ink">Jenvu</span><div id="terminal-toolbar-slot" className="hidden min-w-0 flex-1 items-center md:flex" /><span>👤</span></header>
        <div className="flex min-h-0 flex-1 gap-2 px-2 pt-2">
          <JenvuChartWorkspace timeframes={TF} timeframe={TF[0]} onTimeframeChange={() => {}} sidePanelOpen railSlot={<button className="inline-flex h-8 items-center rounded-full border border-gc-line px-3 text-[13px]">Ask AI</button>} />
        </div>
      </div>
    </TooltipProvider>
  );
}
