import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowUpRight, Plus, KeyRound, CircleDollarSign, Copy, Check, MessagesSquare, BrainCircuit, Newspaper, CandlestickChart, type LucideIcon } from "lucide-react";
import { useAuthUser } from "@/hooks/useAuthUser";
import { useCredits } from "@/hooks/useCredits";
import { useAnimatedNumber } from "@/hooks/useAnimatedNumber";



type Product = { title: string; text: string; to: string; img?: string; aurora?: number; icon?: LucideIcon; badge?: string };

const PRODUCTS: Product[] = [
  { title: "Chat API", text: "One API for all Jenvu models.", to: "/dashboard/api", aurora: 1, icon: MessagesSquare },
  { title: "Models", text: "Compare model pricing & limits.", to: "/dashboard/models", aurora: 2, icon: BrainCircuit, badge: "New" },
  { title: "News", text: "Upcoming high-impact releases.", to: "/dashboard/news", aurora: 3, icon: Newspaper },
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
  const shown = useAnimatedNumber(balance, !credits.isLoading, "overview-api-credit");

  return (
    <section className="console-home mx-auto mb-10 w-full max-w-[1100px]">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-[28px] font-medium tracking-tight text-foreground sm:text-[32px]">Welcome, {name}</h1>
        {keysCount !== null && hasKeys && (
          <Link to="/dashboard/api" className="console-pill console-pill-solid">
            <Plus className="h-4 w-4" aria-hidden="true" /> Create API key
          </Link>
        )}
      </div>

      {keysCount === null ? (
        <div className="mt-8 h-40 animate-pulse bg-muted/40" aria-hidden="true" />
      ) : hasKeys ? (
        <div className="overview-summary mt-8 flex flex-col gap-4">
          <div className="console-card flex flex-wrap items-center justify-between gap-4 p-5">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-foreground text-background">
                <CircleDollarSign className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <p className="text-[16px] font-medium text-foreground">Add credits to start using the API</p>
                <p className={`mt-1 text-[14px] tabular-nums text-muted-foreground ${shown.flash ? `value-flash-${shown.flash}` : ""}`}>
                  Credit balance: {credits.isLoading ? "—" : `$${shown.value.toFixed(2)}`}
                </p>
              </div>
            </div>
            <Link to="/dashboard/pay" className="console-pill console-pill-solid">Add credits</Link>
          </div>

          <div className="console-card p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <KeyRound className="h-5 w-5 text-foreground" aria-hidden="true" />
                <div>
                  <p className="text-[16px] font-medium text-foreground">Start using your API keys</p>
                  <p className="mt-1 text-[14px] text-muted-foreground">
                    You have {keysCount} API key{keysCount === 1 ? "" : "s"}. Send your first request below.
                  </p>
                </div>
              </div>
              <Link to="/dashboard/api" className="inline-flex items-center gap-1 text-[14px] text-foreground hover:underline">
                API keys <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
            <CodeConsole />
          </div>
        </div>
      ) : (
        <div className="overview-summary mt-8 flex flex-col gap-4">
          <Link to="/dashboard/billing" className="console-card flex items-center justify-between gap-3 px-5 py-3">
            <span className="flex items-center gap-2.5 text-[14px] text-foreground">
              <CircleDollarSign className="h-4 w-4" aria-hidden="true" />
              Credits: {credits.isLoading ? "—" : `$${shown.value.toFixed(2)}`}
            </span>
            <span className="text-[14px] text-muted-foreground">Billing</span>
          </Link>
          <div className="console-card flex flex-wrap items-center justify-between gap-4 p-6">
            <div className="flex items-center gap-3">
              <KeyRound className="h-5 w-5 text-foreground" aria-hidden="true" />
              <div>
                <p className="text-[16px] font-medium text-foreground">Create your first API Key</p>
                <p className="mt-1 text-[14px] text-muted-foreground">API keys are used to authenticate API requests</p>
              </div>
            </div>
            <Link to="/dashboard/api" className="console-pill console-pill-white">Create API key</Link>
          </div>
        </div>
      )}

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

type Tab = "Code" | "Chat" | "Image" | "Voice";
type Lang = "bash" | "python" | "node.js";
const PROMPTS: Record<Tab, string> = {
  Code: "Write a Python function that reverses a string.",
  Chat: "Explain what an API key is in one sentence.",
  Image: "A gold bar on a dark desk, studio light.",
  Voice: "Say hello and welcome the user to Jenvu.",
};
function snippet(tab: Tab, lang: Lang): string {
  const prompt = PROMPTS[tab];
  if (lang === "python")
    return `from openai import OpenAI\n\nclient = OpenAI(api_key="YOUR_JENVU_API_KEY", base_url="https://jenvu.com/api/public/v1")\n\nres = client.chat.completions.create(\n    model="deepseek-v3.2",\n    messages=[{"role": "user", "content": "${prompt}"}],\n)\nprint(res.choices[0].message.content)`;
  if (lang === "node.js")
    return `import OpenAI from "openai";\n\nconst client = new OpenAI({ apiKey: process.env.JENVU_API_KEY, baseURL: "https://jenvu.com/api/public/v1" });\n\nconst res = await client.chat.completions.create({\n  model: "deepseek-v3.2",\n  messages: [{ role: "user", content: "${prompt}" }],\n});\nconsole.log(res.choices[0].message.content);`;
  return `curl https://jenvu.com/api/public/v1/chat/completions \\\n  -H "Content-Type: application/json" \\\n  -H "Authorization: Bearer $JENVU_API_KEY" \\\n  -d '{\n    "model": "deepseek-v3.2",\n    "messages": [{"role": "user", "content": "${prompt}"}]\n  }'`;
}

function CodeConsole() {
  const [tab, setTab] = useState<Tab>("Code");
  const [lang, setLang] = useState<Lang>("bash");
  const [copied, setCopied] = useState(false);
  const code = snippet(tab, lang);
  const copy = () => {
    void navigator.clipboard?.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <div className="mt-5">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border">
        <div className="flex gap-1">
          {(Object.keys(PROMPTS) as Tab[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`-mb-px border-b-2 px-3 py-2 text-[14px] ${tab === t ? "border-foreground text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}
            >
              {t}
            </button>
          ))}
        </div>
        <Link to="/docs" className="inline-flex items-center gap-1 pb-2 text-[14px] text-muted-foreground hover:text-foreground">
          View docs <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
      <div className="mt-3 overflow-hidden border border-border bg-muted/40">
        <div className="flex items-center justify-between border-b border-border px-3 py-2">
          <select
            value={lang}
            onChange={(e) => setLang(e.target.value as Lang)}
            className="bg-transparent text-[13px] text-foreground outline-none"
            aria-label="Language"
          >
            <option value="bash">bash</option>
            <option value="python">python</option>
            <option value="node.js">node.js</option>
          </select>
          <button type="button" onClick={copy} className="inline-flex items-center gap-1 text-[13px] text-muted-foreground hover:text-foreground" aria-label="Copy code">
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} {copied ? "Copied" : "Copy"}
          </button>
        </div>
        <pre className="overflow-x-auto p-4 text-[13px] leading-relaxed text-foreground"><code>{code}</code></pre>
      </div>
    </div>
  );
}
