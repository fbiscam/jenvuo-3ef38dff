import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowUpRight, Plus, Copy, Check, Package, BookOpen, Activity, BrainCircuit, type LucideIcon } from "lucide-react";
import { useAuthUser } from "@/hooks/useAuthUser";
import { useCredits } from "@/hooks/useCredits";
import { highlight } from "@/components/dashboard/CodeHighlight";
import { ProviderLogo } from "@/components/models/ModelsExplorer";
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

type Resource = { title: string; text: string; to: string; icon: LucideIcon; mono?: string; live?: boolean };
const RESOURCES: Resource[] = [
  { title: "Python SDK", text: "Works with the OpenAI SDK, just change the base URL.", to: "/docs", icon: Package, mono: "pip install openai" },
  { title: "API Documentation", text: "Endpoints, streaming and request examples.", to: "/docs", icon: BookOpen },
  { title: "Platform Status", text: "All systems operational.", to: "/status", icon: Activity, live: true },
  { title: "Models & Limits", text: "Available models, pricing and your plan limits.", to: "/dashboard/models", icon: BrainCircuit },
];

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
    <div className="console-card quickstart-card flex min-h-[184px] flex-col bg-white p-6 text-neutral-900">
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
        <div className="console-card flex min-h-[184px] flex-col p-6">
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

      <h2 className="mt-12 text-[18px] font-medium text-foreground">Developer resources</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {RESOURCES.map((r) => (
          <Link key={r.title} to={r.to} className="console-card group flex flex-col p-5">
            <p className="flex items-center justify-between text-[16px] font-medium text-foreground">
              <span className="flex items-center gap-2">
                {r.title === "Python SDK" ? <PythonLogo /> : r.title === "Platform Status" ? <PlatformLogo framed className="h-6 w-6" /> : r.live ? (
                  <span className="relative flex h-2.5 w-2.5" aria-hidden="true">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-60" />
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
                  </span>
                ) : (
                  <r.icon className="h-4 w-4" aria-hidden="true" />
                )}
                {r.title}
                {r.live ? <span className="relative ml-1 flex h-2.5 w-2.5" aria-hidden="true"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-60" /><span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" /></span> : null}
              </span>
              <ArrowUpRight className="h-4 w-4 opacity-60 transition group-hover:opacity-100" aria-hidden="true" />
            </p>
            {r.mono ? (
              <code className="mt-3 block rounded-md border border-border bg-muted px-2.5 py-1.5 font-mono text-[13px] text-foreground">{r.mono}</code>
            ) : null}
            {r.title === "Models & Limits" ? (
              <span className="mt-3 flex items-center gap-1.5">
                {(["openai", "anthropic", "deepseek", "google"] as const).map((p) => <ProviderLogo key={p} provider={p} bare />)}
              </span>
            ) : null}
            <p className="mt-2 text-[14px] leading-relaxed text-muted-foreground">{r.text}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
