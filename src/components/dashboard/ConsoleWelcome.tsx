import { Link } from "@tanstack/react-router";
import { ArrowUpRight, BrainCircuit, Cpu, KeyRound, MessageSquareText, Plus, Terminal } from "lucide-react";
import { useAuthUser } from "@/hooks/useAuthUser";
import { useCredits } from "@/hooks/useCredits";
import type { LucideIcon } from "lucide-react";

type Product = { title: string; text: string; to: string; icon: LucideIcon; badge?: string };

const PRODUCTS: Product[] = [
  { title: "Chat API", text: "Call Jenvu models from your own apps with a compatible Chat Completions API.", to: "/dashboard/api", icon: MessageSquareText },
  { title: "Models", text: "Compare every model we serve, with context size and price per million tokens.", to: "/dashboard/models", icon: BrainCircuit, badge: "New" },
  { title: "JX Bot", text: "Run the Gold M15 Expert Advisor on MT5 with a stop loss on every trade.", to: "/dashboard/jx-bot", icon: Cpu },
  { title: "Terminal", text: "Read sweeps, zones and FVGs on XAU/USD and ask the AI desk about any chart.", to: "/dashboard/terminal", icon: Terminal },
];

/** xAI console-style dashboard home: welcome line, balance and keys cards, product grid. */
export default function ConsoleWelcome({ name: profileName, keysCount }: { name?: string; keysCount: number | null }) {
  const { user } = useAuthUser();
  const credits = useCredits();
  const meta = (user?.user_metadata ?? {}) as Record<string, unknown>;
  const name = String(profileName?.trim() || meta.full_name || meta.name || user?.email?.split("@")[0] || "trader");
  const plan = (credits.plan as { name?: string; tier?: string } | null | undefined);
  const planName = String(plan?.name ?? plan?.tier ?? "Free");

  return (
    <section className="console-home mb-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="console-title text-[28px] font-medium tracking-tight text-foreground sm:text-[32px]">Welcome, {name}</h1>
        <Link to="/dashboard/api" className="console-pill console-pill-solid">
          <Plus className="h-4 w-4" aria-hidden="true" /> Create API key
        </Link>
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-2">
        <div className="console-card flex flex-col justify-between p-6">
          <div>
            <p className="text-[14px] text-muted-foreground">Credit balance</p>
            <p className="mt-2 text-[40px] font-medium leading-none tracking-tight text-foreground">
              {credits.isLoading ? "—" : `$${(credits.balance || 0).toFixed(2)}`}
            </p>
            <p className="mt-3 text-[14px] text-muted-foreground">Plan: <span className="text-foreground">{planName}</span> · Usage is billed at $3 per million tokens.</p>
          </div>
          <div className="mt-6 flex flex-wrap gap-2">
            <Link to="/dashboard/billing" className="console-pill console-pill-solid">Add credits</Link>
            <Link to="/dashboard/usage" className="console-pill">View usage</Link>
          </div>
        </div>

        <div className="console-card flex flex-col justify-between p-6">
          <div>
            <p className="flex items-center gap-2 text-[14px] text-muted-foreground"><KeyRound className="h-4 w-4" aria-hidden="true" /> API keys</p>
            <p className="mt-2 text-[40px] font-medium leading-none tracking-tight text-foreground">{keysCount ?? "—"}</p>
            <p className="mt-3 text-[14px] text-muted-foreground">Use a key to send requests to Jenvu models from your code.</p>
          </div>
          <div className="mt-6 flex flex-wrap gap-2">
            <Link to="/dashboard/api" className="console-pill console-pill-solid">Create API key</Link>
            <Link to="/docs" className="console-pill">Read the docs <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" /></Link>
          </div>
        </div>
      </div>

      <h2 className="console-section-title mt-12 text-[18px] font-medium text-foreground">Explore our products</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {PRODUCTS.map((p) => {
          const Icon = p.icon;
          return (
            <Link key={p.title} to={p.to} className="console-card group flex flex-col p-5 transition hover:brightness-[0.98]">
              <div className="flex items-center justify-between">
                <span className="console-icon-chip"><Icon className="h-[18px] w-[18px]" strokeWidth={1.75} aria-hidden="true" /></span>
                {p.badge && <span className="console-badge">{p.badge}</span>}
              </div>
              <p className="mt-5 text-[16px] font-medium text-foreground">{p.title}</p>
              <p className="mt-1.5 text-[14px] leading-relaxed text-muted-foreground">{p.text}</p>
              <span className="mt-auto inline-flex items-center gap-1 pt-5 text-[14px] font-medium text-foreground">
                Open <ArrowUpRight className="h-4 w-4 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden="true" />
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
