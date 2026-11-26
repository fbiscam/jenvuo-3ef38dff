import { Link } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { ArrowUpRight, Plus, KeyRound, CircleDollarSign, Copy, Check } from "lucide-react";
import { useAuthUser } from "@/hooks/useAuthUser";
import { useCredits } from "@/hooks/useCredits";
import { useAnimatedNumber } from "@/hooks/useAnimatedNumber";



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
        <div className="mt-8 h-40 animate-pulse rounded-[18px] bg-muted/40" aria-hidden="true" />
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
      <div className="code-panel mt-3 overflow-hidden border border-border">
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
        <pre className="overflow-x-auto p-4 text-[13px] leading-relaxed text-foreground"><code>{highlight(code)}</code></pre>
      </div>
    </div>
  );
}

const TOKEN_RE = /("(?:[^"\\]|\\.)*"|'[^']*')|\b(from|import|const|await|print|curl|new)\b|(\s-[a-zA-Z]+\b)|\b([A-Za-z_][\w.]*)(?=\()/g;
function highlight(code: string) {
  const out: ReactNode[] = [];
  let last = 0;
  let i = 0;
  for (const m of code.matchAll(TOKEN_RE)) {
    const at = m.index ?? 0;
    if (at > last) out.push(code.slice(last, at));
    const cls = m[1] ? "tok-str" : m[2] ? "tok-kw" : m[3] ? "tok-flag" : "tok-fn";
    out.push(<span key={i++} className={cls}>{m[0]}</span>);
    last = at + m[0].length;
  }
  out.push(code.slice(last));
  return out;
}
