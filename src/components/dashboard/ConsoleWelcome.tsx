import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowUp, ArrowUpRight, ArrowRight, Copy, KeyRound, Paperclip, SlidersHorizontal, ChevronDown, Shuffle, LineChart, Newspaper, Code2, Bot, MessagesSquare, CandlestickChart, Check } from "lucide-react";
import { toast } from "sonner";
import { useCredits } from "@/hooks/useCredits";

const IDEAS = [
  { icon: LineChart, text: "Analyse XAU/USD 1H structure" },
  { icon: Newspaper, text: "Summarise today's high-impact news" },
  { icon: Code2, text: "Write a Python API request" },
  { icon: Bot, text: "Explain a liquidity sweep" },
];

const SETUP_PROMPT = `# Jenvu API — setup for coding agents

You have access to the Jenvu API: one OpenAI-compatible endpoint for every Jenvu model. Use the JENVU_API_KEY environment variable as a Bearer token.

- Chat — POST /v1/chat/completions with a model id and messages.
- Models — GET /v1/models lists every model you can call.

Read the docs at https://jenvu.com/docs before writing code.`;

/** Dashboard home: prompt box, two product cards, coding-agent prompt and API key/usage card. */
export default function ConsoleWelcome({ keysCount }: { name?: string; keysCount: number | null }) {
  const credits = useCredits();
  const navigate = useNavigate();
  const [prompt, setPrompt] = useState("");
  const [copied, setCopied] = useState(false);
  const balance = credits.balance || 0;
  const hasKeys = (keysCount ?? 0) > 0;

  const send = (text = prompt) => {
    if (!text.trim()) return;
    try { sessionStorage.setItem("jenvu-chat-draft", text.trim()); } catch { /* ignore */ }
    navigate({ to: "/dashboard/chat" });
  };
  const copyPrompt = async () => {
    await navigator.clipboard.writeText(SETUP_PROMPT);
    setCopied(true); toast.success("Prompt copied"); setTimeout(() => setCopied(false), 1500);
  };

  return (
    <section className="console-home mx-auto mb-10 w-full max-w-[960px] pt-6">
      <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">Dashboard <span className="mx-1 opacity-50">/</span> API</p>
      <h1 className="mt-2 flex items-center gap-2.5 text-[28px] font-medium tracking-tight text-foreground">
        <CandlestickChart className="h-7 w-7" aria-hidden="true" /> Jenvu
      </h1>

      <div className="mt-6 rounded-2xl border border-border bg-card p-4 shadow-sm">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder="Ask Jenvu anything about gold, news or your code..."
          rows={2}
          className="w-full resize-none bg-transparent px-1 text-[15px] text-foreground outline-none placeholder:text-muted-foreground"
        />
        <div className="mt-2 flex items-center gap-3 text-[13px] text-muted-foreground">
          <Paperclip className="h-4 w-4" aria-hidden="true" />
          <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
          <span className="flex items-center gap-1 text-foreground">Jenvu Chat <ChevronDown className="h-3.5 w-3.5" /></span>
          <span className="flex items-center gap-1">High <ChevronDown className="h-3.5 w-3.5" /></span>
          <button type="button" onClick={() => send()} aria-label="Send" disabled={!prompt.trim()}
            className="ml-auto flex h-9 w-9 items-center justify-center rounded-full bg-foreground text-background disabled:opacity-40">
            <ArrowUp className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {IDEAS.map((i) => (
          <button key={i.text} type="button" onClick={() => setPrompt(i.text)}
            className="flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-[13px] text-muted-foreground transition hover:text-foreground">
            <i.icon className="h-3.5 w-3.5" aria-hidden="true" /> {i.text}
          </button>
        ))}
        <button type="button" aria-label="Random idea" onClick={() => setPrompt(IDEAS[Math.floor(Math.random() * IDEAS.length)]!.text)}
          className="flex h-8 w-8 items-center justify-center rounded-full border border-border text-muted-foreground hover:text-foreground">
          <Shuffle className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="mt-10 grid gap-4 md:grid-cols-2">
        {[
          { title: "Chat API", text: "Hosted models", to: "/dashboard/api", aurora: 1, icon: MessagesSquare },
          { title: "Terminal", text: "Live gold charts", to: "/dashboard/terminal", aurora: 2, icon: CandlestickChart },
        ].map((p) => (
          <Link key={p.title} to={p.to} className="group flex items-stretch overflow-hidden rounded-xl border border-border bg-card">
            <div className="flex w-[72px] shrink-0 items-center justify-center" style={{ backgroundImage: `var(--platform-aurora-${p.aurora})` }}>
              <p.icon className="h-5 w-5 text-foreground/70" aria-hidden="true" />
            </div>
            <div className="flex flex-1 items-center justify-between px-4 py-4">
              <div>
                <p className="text-[15px] font-medium text-foreground">{p.title}</p>
                <p className="text-[13px] text-muted-foreground">{p.text}</p>
              </div>
              <ArrowUpRight className="h-4 w-4 text-muted-foreground transition group-hover:text-foreground" aria-hidden="true" />
            </div>
          </Link>
        ))}
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div className="relative flex min-h-[260px] flex-col overflow-hidden rounded-xl border border-border bg-card p-4">
          <p className="text-[15px] font-medium text-foreground">For your coding agent</p>
          <pre className="mt-3 flex-1 overflow-hidden whitespace-pre-wrap font-mono text-[11px] leading-relaxed text-muted-foreground/70">{SETUP_PROMPT}</pre>
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-card to-transparent" />
          <button type="button" onClick={copyPrompt}
            className="absolute bottom-4 right-4 flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-[13px] font-medium text-foreground shadow-sm">
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />} Copy prompt
          </button>
        </div>

        <div className="flex flex-col rounded-xl border border-border bg-card">
          <div className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-[15px] font-medium text-foreground">API key</p>
              <Link to="/dashboard/api" className="text-[13px] text-muted-foreground hover:text-foreground">View all</Link>
            </div>
            <Link to="/dashboard/api" className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-muted px-3 py-2 text-[13px] font-medium text-foreground">
              <KeyRound className="h-3.5 w-3.5" /> {hasKeys ? `Manage ${keysCount} API key${keysCount === 1 ? "" : "s"}` : "Create API key"}
            </Link>
          </div>
          <div className="flex flex-1 flex-col border-t border-border p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[15px] font-medium text-foreground">Usage</p>
                <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                  Balance <span className="text-foreground">{credits.isLoading ? "—" : `$${balance.toFixed(2)}`}</span>
                  <span className="mx-2 opacity-50">·</span>Keys <span className="text-foreground">{keysCount ?? "—"}</span>
                </p>
              </div>
              <Link to="/dashboard/usage" className="flex items-center gap-1 text-[13px] text-muted-foreground hover:text-foreground">View all <ArrowRight className="h-3.5 w-3.5" /></Link>
            </div>
            <p className="m-auto py-6 text-[13px] text-muted-foreground">{hasKeys ? "See your requests on the Usage page." : "No requests yet."}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
