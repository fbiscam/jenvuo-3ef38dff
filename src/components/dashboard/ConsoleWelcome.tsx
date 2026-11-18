import { Link } from "@tanstack/react-router";
import { ArrowUpRight, Plus, MessagesSquare, BrainCircuit, Bot, CandlestickChart, type LucideIcon } from "lucide-react";
import { useAuthUser } from "@/hooks/useAuthUser";
import { useCredits } from "@/hooks/useCredits";



type Product = { title: string; text: string; to: string; img?: string; aurora?: number; icon?: LucideIcon; badge?: string };

const PRODUCTS: Product[] = [
  { title: "Chat API", text: "One API for all Jenvu models.", to: "/dashboard/api", aurora: 1, icon: MessagesSquare },
  { title: "Models", text: "Compare model pricing & limits.", to: "/dashboard/models", aurora: 2, icon: BrainCircuit, badge: "New" },
  { title: "JX Bot", text: "EUR/USD M15 automated EA.", to: "/dashboard/jx-bot", aurora: 3, icon: Bot },
  { title: "Terminal", text: "Live SMC sweeps, zones and desk.", to: "/dashboard/terminal", aurora: 1, icon: CandlestickChart },
];

/** xAI console-style dashboard home: welcome line, two start cards, product grid. */
export default function ConsoleWelcome({ name: profileName, keysCount }: { name?: string; keysCount: number | null }) {
  const { user } = useAuthUser();
  const credits = useCredits();
  const meta = (user?.user_metadata ?? {}) as Record<string, unknown>;
  const name = String(profileName?.trim() || meta.full_name || meta.name || user?.email?.split("@")[0] || "trader").split(" ")[0];
  const balance = credits.balance || 0;
  const hasKeys = (keysCount ?? 0) > 0;

  return (
    <section className="console-home mx-auto mb-10 w-full max-w-[1100px]">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-[28px] font-medium tracking-tight text-foreground sm:text-[32px]">Welcome, {name}</h1>
        <Link to="/dashboard/api" className="console-pill console-pill-solid">
          <Plus className="h-4 w-4" aria-hidden="true" /> Create API key
        </Link>
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-2">
        <div className="console-card flex min-h-[184px] flex-col justify-between p-6">
          <p className="text-[16px] font-medium text-foreground">
            {balance > 0 ? "Your API credit balance." : "Pick a plan to get more API credit."}
          </p>
          <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
            <p className="text-[40px] font-medium leading-none tracking-tight tabular-nums text-foreground">
              {credits.isLoading ? "—" : `$${balance.toFixed(2)}`}
            </p>
            <Link to="/dashboard/pay" className="console-pill console-pill-solid">Upgrade plan</Link>
          </div>
        </div>

        <div className="console-card flex min-h-[184px] flex-col justify-between p-6">
          <div>
            <p className="text-[16px] font-medium text-foreground">
              {hasKeys ? `You have ${keysCount} API key${keysCount === 1 ? "" : "s"}` : "Create your first API Key"}
            </p>
            <p className="mt-2 text-[14px] text-muted-foreground">
              Use a key to send requests to Jenvu models from your code.
            </p>
          </div>
          <div className="mt-6 flex flex-wrap gap-2">
            <Link to="/dashboard/api" className="console-pill">
              {hasKeys ? "Manage API keys" : "Create API key"}
            </Link>
            <Link to="/docs" className="console-pill">
              Read the docs <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </div>

    </section>
  );
}
