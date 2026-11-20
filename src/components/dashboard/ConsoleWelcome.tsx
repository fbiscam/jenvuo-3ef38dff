import { Link } from "@tanstack/react-router";
import { ArrowUpRight, Plus, MessagesSquare, BrainCircuit, Bot, CandlestickChart, type LucideIcon } from "lucide-react";
import { useAuthUser } from "@/hooks/useAuthUser";
import { useCredits } from "@/hooks/useCredits";
import BotPerformanceCard from "@/components/dashboard/BotPerformanceCard";
import { PlatformLogo } from "@/components/brand/ProductLogos";



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

      <div className="mt-8 grid items-stretch gap-4 md:grid-cols-2">
        <div className="console-card flex flex-col p-6">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <PlatformLogo framed className="h-8 w-8" />
              <p className="text-[16px] font-medium text-foreground">API credit</p>
            </div>
            <span className="text-[12px] text-muted-foreground">{balance > 0 ? "Balance" : "Pick a plan for more"}</span>
          </div>
          <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
            <p className="text-[40px] font-medium leading-none tracking-tight tabular-nums text-foreground">
              {credits.isLoading ? "—" : `$${balance.toFixed(2)}`}
            </p>
            <Link to="/dashboard/api" className="console-pill border-border bg-white text-black hover:bg-white/90">
              {hasKeys ? "Manage API keys" : "Create API key"}
            </Link>
          </div>

          <div className="mt-6 flex flex-col gap-4 border-t border-border pt-6 ">
            <div className="min-w-0">
              <p className="text-[16px] font-medium text-foreground">
                {hasKeys ? `You have ${keysCount} API key${keysCount === 1 ? "" : "s"}` : "Create your first API Key"}
              </p>
              <p className="mt-2 text-[14px] text-muted-foreground">
                Use a key to send requests to Jenvu models from your code.
              </p>
            </div>
          </div>
        </div>

        <BotPerformanceCard />
      </div>

      <h2 className="mt-12 text-[18px] font-medium text-foreground">Explore our products</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {PRODUCTS.map((p) => (
          <Link key={p.title} to={p.to} className="console-card group flex flex-col overflow-hidden">
            <div className="relative aspect-[16/10] overflow-hidden">
              {p.aurora ? (
                <div className="flex h-full w-full items-center justify-center" style={{ backgroundImage: `var(--platform-aurora-${p.aurora})` }}>
                  <span className="flex h-14 w-14 items-center justify-center rounded-xl bg-background text-foreground transition duration-500 group-hover:scale-110">
                    {p.icon && <p.icon className="h-7 w-7" aria-hidden="true" />}
                  </span>
                </div>
              ) : (
              <img
                src={p.img}
                alt=""
                loading="lazy"
                className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]"
              />
              )}
              {p.badge && <span className="absolute left-3 top-3 rounded-full bg-background px-2.5 py-0.5 text-[12px] font-medium text-foreground">{p.badge}</span>}
            </div>
            <div className="flex flex-1 flex-col p-5">
              <p className="flex items-center justify-between text-[16px] font-medium text-foreground">
                {p.title}
                <ArrowUpRight className="h-4 w-4 opacity-60 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:opacity-100" aria-hidden="true" />
              </p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
