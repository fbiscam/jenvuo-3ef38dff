import { Link } from "@tanstack/react-router";
import { ArrowUpRight, Plus } from "lucide-react";
import { useAuthUser } from "@/hooks/useAuthUser";
import { useCredits } from "@/hooks/useCredits";
import chatImg from "@/assets/home/hero-ai-1.jpg";
import modelsImg from "@/assets/home/hero-ai-2.jpg";
import botImg from "@/assets/home/hero-ai-3.jpg";
import terminalImg from "@/assets/home/hero-ai-4.jpg";

type Product = { title: string; text: string; to: string; img: string; badge?: string };

const PRODUCTS: Product[] = [
  { title: "Chat API", text: "Build with Jenvu models through one compatible API.", to: "/dashboard/api", img: chatImg },
  { title: "Models", text: "Compare context size and price per million tokens.", to: "/dashboard/models", img: modelsImg, badge: "New" },
  { title: "JX Bot", text: "Gold M15 Expert Advisor for MT5 with a stop loss.", to: "/dashboard/jx-bot", img: botImg },
  { title: "Terminal", text: "Sweeps, zones and FVGs on XAU/USD with an AI desk.", to: "/dashboard/terminal", img: terminalImg },
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
            {balance > 0 ? "Your API credit balance." : "Add credits to start using the API."}
          </p>
          <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
            <p className="text-[40px] font-medium leading-none tracking-tight tabular-nums text-foreground">
              {credits.isLoading ? "—" : `$${balance.toFixed(2)}`}
            </p>
            <Link to="/dashboard/billing" className="console-pill console-pill-solid">Add credits</Link>
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

      <h2 className="mt-12 text-[18px] font-medium text-foreground">Explore our products</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {PRODUCTS.map((p) => (
          <Link key={p.title} to={p.to} className="console-card group flex flex-col overflow-hidden">
            <div className="relative aspect-[16/10] overflow-hidden">
              <img
                src={p.img}
                alt=""
                loading="lazy"
                className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]"
              />
              {p.badge && <span className="console-badge absolute left-3 top-3">{p.badge}</span>}
            </div>
            <div className="flex flex-1 flex-col p-5">
              <p className="flex items-center justify-between text-[16px] font-medium text-foreground">
                {p.title}
                <ArrowUpRight className="h-4 w-4 opacity-60 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:opacity-100" aria-hidden="true" />
              </p>
              <p className="mt-1.5 text-[14px] leading-relaxed text-muted-foreground">{p.text}</p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
