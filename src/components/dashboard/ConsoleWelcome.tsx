import { Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  ArrowUpRight, Plus, KeyRound, CircleDollarSign, Code2, MessageCircle, BrainCircuit,
  Copy, Check, type LucideIcon,
} from "lucide-react";
import { useAuthUser } from "@/hooks/useAuthUser";
import { useCredits } from "@/hooks/useCredits";
import { highlight } from "@/components/dashboard/CodeHighlight";

const BASE = "https://jenvu.com/api/public/v1";
type Lang = "bash" | "python" | "node";
const LANGS: Lang[] = ["bash", "python", "node"];

function chatSnippet(lang: Lang, prompt: string): string {
  if (lang === "python") {
    return `from openai import OpenAI

client = OpenAI(base_url="${BASE}", api_key="JENVU_API_KEY")
res = client.chat.completions.create(
    model="gpt-5.5",
    messages=[{"role": "user", "content": "${prompt}"}],
)
print(res.choices[0].message.content)`;
  }
  if (lang === "node") {
    return `import OpenAI from "openai";

const client = new OpenAI({ baseURL: "${BASE}", apiKey: process.env.JENVU_API_KEY });
const res = await client.chat.completions.create({
  model: "gpt-5.5",
  messages: [{ role: "user", content: "${prompt}" }],
});
console.log(res.choices[0].message.content);`;
  }
  return `curl ${BASE}/chat/completions \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer $JENVU_API_KEY" \\
  -d '{
    "model": "gpt-5.5",
    "messages": [{"role": "user", "content": "${prompt}"}]
  }'`;
}

function modelsSnippet(lang: Lang): string {
  if (lang === "python") {
    return `from openai import OpenAI

client = OpenAI(base_url="${BASE}", api_key="JENVU_API_KEY")
for model in client.models.list():
    print(model.id)`;
  }
  if (lang === "node") {
    return `import OpenAI from "openai";

const client = new OpenAI({ baseURL: "${BASE}", apiKey: process.env.JENVU_API_KEY });
const list = await client.models.list();
for (const model of list.data) console.log(model.id);`;
  }
  return `curl ${BASE}/models \\
  -H "Authorization: Bearer $JENVU_API_KEY"`;
}

type Tab = { id: "code" | "chat" | "models"; label: string; icon: LucideIcon; snippet: (l: Lang) => string };
const TABS: Tab[] = [
  { id: "code", label: "Code", icon: Code2, snippet: (l) => chatSnippet(l, "Fix this function and explain the bug: function median(a){a.sort();return a[a.length/2]}") },
  { id: "chat", label: "Chat", icon: MessageCircle, snippet: (l) => chatSnippet(l, "Give me today's XAU/USD liquidity levels.") },
  { id: "models", label: "Models", icon: BrainCircuit, snippet: modelsSnippet },
];

/** xAI console-style dashboard home: welcome line, notice card, credit strip, API quickstart. */
export default function ConsoleWelcome({ name: profileName, keysCount }: { name?: string; keysCount: number | null }) {
  const { user } = useAuthUser();
  const credits = useCredits();
  const meta = (user?.user_metadata ?? {}) as Record<string, unknown>;
  const name = String(profileName?.trim() || meta.full_name || meta.name || user?.email?.split("@")[0] || "trader").split(" ")[0];
  const balance = credits.balance || 0;
  const hasKeys = (keysCount ?? 0) > 0;

  const [tab, setTab] = useState<Tab["id"]>("code");
  const [lang, setLang] = useState<Lang>("bash");
  const [copied, setCopied] = useState(false);
  const code = (TABS.find((t) => t.id === tab) ?? TABS[0]).snippet(lang);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* clipboard blocked */ }
  };

  return (
    <section className="console-home mx-auto mb-10 flex w-full max-w-[920px] flex-col lg:min-h-[calc(100vh-13rem)] lg:justify-center">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-[28px] font-medium tracking-tight text-foreground sm:text-[34px]">Welcome, {name}</h1>
        <Link to="/dashboard/api" className="console-pill console-pill-solid h-10 px-5 text-[15px]">
          <Plus className="h-4 w-4" aria-hidden="true" /> Create API key
        </Link>
      </div>

      {/* Notice card */}
      <div className="console-card mt-7 p-5">
        <p className="text-[16px] font-medium text-foreground">Next-generation AI trading &amp; developer platform</p>
        <p className="mt-1 text-[14px] text-foreground">
          Real-time Gold Terminal analysis, JX Bot for EUR/USD M15 and fast developer APIs, all in one account.
        </p>
        <p className="mt-1.5 text-[14px] text-muted-foreground">Paid plans include JX Bot. Free includes the Terminal and monthly API credit.</p>
        <Link to="/dashboard/terminal" className="console-pill console-pill-solid mt-4 h-9 px-4 text-[14px]">Get started</Link>
      </div>

      {/* Credit strip */}
      <div className="console-card mt-3 flex flex-wrap items-center justify-between gap-3 px-5 py-4">
        <div className="flex items-center gap-3">
          <CircleDollarSign className="console-coin h-6 w-6 shrink-0" aria-hidden="true" />
          <div>
            <p className="text-[15px] font-medium text-foreground">
              {balance > 0 ? "Your API credit is ready to use." : "Add credits to start using the API."}
            </p>
            <p className="mt-0.5 text-[13px] text-muted-foreground tabular-nums">
              Credit balance: {credits.isLoading ? "—" : `$${balance.toFixed(2)}`}
            </p>
          </div>
        </div>
        <Link to="/dashboard/pay" className="console-pill console-pill-solid h-9 px-4 text-[14px]">Add credits</Link>
      </div>

      {/* API quickstart */}
      <div className="console-card mt-3 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <KeyRound className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
            <div>
              <p className="text-[16px] font-medium text-foreground">
                {hasKeys ? `You have ${keysCount} API key${keysCount === 1 ? "" : "s"}` : "Start using your API keys"}
              </p>
              <p className="mt-0.5 text-[13px] text-muted-foreground">You can manage and create API keys.</p>
            </div>
          </div>
          <Link to="/dashboard/api" className="console-pill h-9 px-4 text-[14px]">
            API keys <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </div>

        <div className="code-box mt-4 overflow-hidden rounded-xl">
          <div className="flex items-center justify-between gap-2 border-b border-[color:var(--console-line)] px-2.5 py-2">
            <div className="flex min-w-0 items-center gap-1 overflow-x-auto" role="tablist" aria-label="Example type">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  aria-selected={tab === t.id}
                  onClick={() => setTab(t.id)}
                  className={`inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3 text-[14px] transition ${
                    tab === t.id ? "bg-muted font-medium text-foreground" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <t.icon className="h-4 w-4" aria-hidden="true" /> {t.label}
                </button>
              ))}
            </div>
            <Link to="/docs" className="inline-flex shrink-0 items-center gap-1 px-2 text-[14px] text-foreground hover:opacity-70">
              <span className="hidden sm:inline">View docs</span><span className="sr-only sm:hidden">View docs</span> <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </div>

          <div className="px-4 pb-4 pt-3">
            <div className="flex items-center justify-between">
              <label className="relative inline-flex items-center font-mono text-[13px] text-muted-foreground">
                <span className="sr-only">Language</span>
                <select
                  value={lang}
                  onChange={(e) => setLang(e.target.value as Lang)}
                  className="bg-transparent pr-1 font-mono text-[13px] text-muted-foreground outline-none"
                >
                  {LANGS.map((l) => <option key={l} value={l}>{l}</option>)}
                </select>
              </label>
              <button
                type="button"
                onClick={() => void copy()}
                aria-label={copied ? "Copied" : "Copy code"}
                className="inline-flex h-7 w-7 items-center justify-center text-muted-foreground hover:text-foreground"
              >
                {copied ? <Check className="h-4 w-4" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
              </button>
            </div>
            <pre className="mt-3 overflow-x-auto whitespace-pre font-mono text-[13px] leading-[1.6] text-foreground">
              <code>{highlight(code)}</code>
            </pre>
          </div>
        </div>
      </div>
    </section>
  );
}
