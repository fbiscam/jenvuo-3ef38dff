import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Copy, Check } from "lucide-react";
import { useAuthUser } from "@/hooks/useAuthUser";
import { useCredits } from "@/hooks/useCredits";
import { highlight } from "@/components/dashboard/CodeHighlight";
import { PRICE_PER_MILLION } from "@/lib/model-catalog";
import starsNebula from "@/assets/platform/stars-nebula.webp";
import starsPlain from "@/assets/platform/stars-plain.webp";
import { PlatformLogo } from "@/components/brand/ProductLogos";

function PythonLogo({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 256 255" className={className} aria-hidden="true">
      <path fill="#3776AB" d="M126.9.1c-64.8 0-60.8 28.1-60.8 28.1l.1 29.1h61.9v8.7H41.6S0 61.4 0 126.8c0 65.4 36.3 63.1 36.3 63.1h21.7v-30.4s-1.2-36.3 35.7-36.3h61.5s34.6.6 34.6-33.4V33.5S194.9.1 126.9.1ZM92.8 19.7a11.1 11.1 0 1 1 0 22.2 11.1 11.1 0 0 1 0-22.2Z"/>
      <path fill="#FFD43B" d="M128.8 254.1c64.8 0 60.8-28.1 60.8-28.1l-.1-29.1h-61.9v-8.7h86.5s41.6 4.7 41.6-60.7c0-65.4-36.3-63.1-36.3-63.1h-21.7v30.4s1.2 36.3-35.7 36.3h-61.5s-34.6-.6-34.6 33.4v56.2s-5.3 33.4 62.9 33.4Zm34.1-19.7a11.1 11.1 0 1 1 0-22.2 11.1 11.1 0 0 1 0 22.2Z"/>
    </svg>
  );
}


function CurlLogo() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" aria-hidden="true">
      <rect width="24" height="24" rx="5" fill="#073551" />
      <path d="M6 8l4 4-4 4" stroke="#fff" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 16h6" stroke="#0FA0CE" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function NodeLogo() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" aria-hidden="true">
      <path fill="#5FA04E" d="M12 1.85 2.9 7.1v10.5L12 22.85l9.1-5.25V7.1L12 1.85Z" />
      <path fill="#fff" d="M12.6 16.6c-2.2 0-2.7-1-2.7-1.9h1.1c.1.6.4.9 1.6.9.9 0 1.3-.2 1.3-.7 0-.3-.1-.5-1.5-.6-1.2-.1-2-.4-2-1.4 0-.9.8-1.5 2.1-1.5 1.5 0 2.2.5 2.3 1.6h-1.1c-.1-.5-.4-.7-1.2-.7-.8 0-1 .3-1 .6 0 .3.2.5 1.4.6 1.3.2 2 .4 2 1.4 0 1-.8 1.6-2.3 1.6Z" />
    </svg>
  );
}

const LANG_LOGO = { cURL: <CurlLogo />, Python: <PythonLogo className="h-3.5 w-3.5" />, "Node.js": <NodeLogo /> } as const;

const BASE = "https://jenvu.com/api/public/v1";

const SNIPPETS = {
  cURL: `curl ${BASE}/chat/completions \\
  -H "Authorization: Bearer $JENVU_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"model": "gpt-5.5", "messages": [{"role": "user", "content": "Hello!"}]}'`,
  Python: `import os
from openai import OpenAI
client = OpenAI(api_key=os.environ["JENVU_API_KEY"], base_url="${BASE}")
r = client.chat.completions.create(model="gpt-5.5", messages=[{"role": "user", "content": "Hello!"}])
print(r.choices[0].message.content)`,
  "Node.js": `import OpenAI from "openai";
const client = new OpenAI({ apiKey: process.env.JENVU_API_KEY, baseURL: "${BASE}" });
const r = await client.chat.completions.create({ model: "gpt-5.5", messages: [{ role: "user", content: "Hello!" }] });
console.log(r.choices[0].message.content);`,
} as const;
type Lang = keyof typeof SNIPPETS;

/** Top (heaviest) model from each lab, shown as starfield cards like the Platform page. */
const TOP_MODELS = [
  { id: "claude-opus-5.5", name: "Claude Opus 5.5", a: "Deep reasoning and long documents", b: "Code review and refactoring", img: starsNebula },
  { id: "gpt-5.5-pro", name: "GPT-5.5 Pro", a: "Extra thinking for hard problems", b: "Trading scripts and coding help", img: starsPlain },
  { id: "gemini-3.1-pro", name: "Gemini 3.1 Pro", a: "Text and image understanding", b: "Charts and screenshots", img: starsPlain },
  { id: "deepseek-v4-pro-max", name: "DeepSeek V4 Pro Max", a: "Strongest DeepSeek for maths", b: "Code and high-volume workloads", img: starsPlain },
] as const;

function QuickstartCard({ hasKeys }: { hasKeys: boolean }) {
  const [lang, setLang] = useState<Lang>("cURL");
  const [copied, setCopied] = useState(false);
  const copy = () => {
    void navigator.clipboard?.writeText(SNIPPETS[lang]).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };
  return (
    <div className="console-card flex min-h-[184px] min-w-0 flex-col bg-white p-6 text-neutral-900">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[16px] font-medium text-foreground">Quickstart</p>
        <div className="flex items-center gap-1">
          {(Object.keys(SNIPPETS) as Lang[]).map((l) => (
            <button key={l} type="button" onClick={() => setLang(l)}
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-medium transition ${lang === l ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"}`}>
              {LANG_LOGO[l]}{l}
            </button>
          ))}
          <button type="button" onClick={copy} aria-label="Copy code" className="ml-1 rounded-full p-1.5 text-muted-foreground hover:text-foreground">
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          </button>
        </div>
      </div>
      <div className="code-box mt-4 min-w-0 flex-1 !bg-white"><pre className="whitespace-pre-wrap break-words font-code text-[13px] leading-[1.7] [overflow-wrap:anywhere]"><code>{highlight(SNIPPETS[lang])}</code></pre></div>
      <div className="mt-3 text-[13px] text-muted-foreground">
        {hasKeys ? "Use one of your active keys as JENVU_API_KEY." : (
          <Link to="/dashboard/api" className="font-medium text-foreground underline-offset-4 hover:underline">Generate API key →</Link>
        )}
      </div>
    </div>
  );
}

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
        <div className="console-card flex min-h-[184px] min-w-0 flex-col p-6">
          <div className="flex items-center gap-3">
            <PlatformLogo framed className="h-9 w-9" />
            <div>
              <p className="text-[16px] font-medium text-foreground">API credit</p>
              <p className="text-[13px] text-muted-foreground">Balance</p>
            </div>
          </div>
          <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
            <p className="text-[40px] font-medium leading-none tracking-tight tabular-nums text-foreground">
              {credits.isLoading ? "—" : `$${balance.toFixed(2)}`}
            </p>
            <Link to="/dashboard/pay" className="console-pill console-pill-solid">Upgrade plan</Link>
          </div>
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4 text-[14px]">
            <span className="text-muted-foreground">{hasKeys ? `You have ${keysCount} API key${keysCount === 1 ? "" : "s"}` : "Create your first API Key"}</span>
            <Link to="/dashboard/api" className="font-medium text-foreground underline-offset-4 hover:underline">{hasKeys ? "Manage API keys →" : "Create API key →"}</Link>
          </div>
        </div>

        <QuickstartCard hasKeys={hasKeys} />
      </div>

      <h2 className="mt-12 text-[18px] font-medium text-foreground">Top models</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {TOP_MODELS.map((m, i) => (
          <Link key={m.id} to="/dashboard/models"
            className="group relative flex aspect-[5/4] flex-col justify-end overflow-hidden rounded-md bg-gc-night px-6 pb-8 text-left text-gc-on-night sm:aspect-[5/7]">
            <img src={m.img} alt="" width={768} height={1056} loading="lazy" className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
              style={{ transform: ["none", "none", "rotate(180deg)", "scaleX(-1)"][i] }} />
            <span className="relative block">
              <span className="block text-[1.5rem] font-medium leading-tight tracking-tight">{m.name}</span>
              <span className="mt-3 block text-[13px] font-medium">Input: ${PRICE_PER_MILLION.toFixed(2)} per 1M tokens</span>
              <span className="mt-1 block text-[13px] font-medium">Output: ${PRICE_PER_MILLION.toFixed(2)} per 1M tokens</span>
              <span className="mt-4 block text-[13px] font-medium">{m.a}</span>
              <span className="mt-1 block text-[13px] font-medium">{m.b}</span>
              <span className="mt-4 block break-all text-[13px] font-medium">Model ID: {m.id}</span>
            </span>
          </Link>
        ))}
      </div>
      <p className="mt-6 text-center text-[13px] italic text-muted-foreground">
        One flat rate for every model, paid from your API credit. See the{" "}
        <Link to="/docs" className="underline underline-offset-2">API docs</Link> and{" "}
        <Link to="/dashboard/models" className="underline underline-offset-2">all models</Link>.
      </p>
    </section>
  );
}
