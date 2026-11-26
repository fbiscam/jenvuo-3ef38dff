import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowUpRight, Plus, Copy, Check, Package, BookOpen, Activity, BrainCircuit, type LucideIcon } from "lucide-react";
import { useAuthUser } from "@/hooks/useAuthUser";
import { useCredits } from "@/hooks/useCredits";



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
    <div className="console-card flex min-h-[184px] flex-col p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[16px] font-medium text-foreground">Quickstart</p>
        <div className="flex items-center gap-1">
          {(Object.keys(SNIPPETS) as Lang[]).map((l) => (
            <button key={l} type="button" onClick={() => setLang(l)}
              className={`rounded-full px-2.5 py-1 text-[12px] font-medium transition ${lang === l ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"}`}>
              {l}
            </button>
          ))}
          <button type="button" onClick={copy} aria-label="Copy code" className="ml-1 rounded-full p-1.5 text-muted-foreground hover:text-foreground">
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          </button>
        </div>
      </div>
      <pre className="mt-4 flex-1 whitespace-pre-wrap rounded-md border border-border bg-muted p-3 font-mono text-[12.5px] leading-relaxed text-foreground [overflow-wrap:anywhere]">{SNIPPETS[lang]}</pre>
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

        <QuickstartCard hasKeys={hasKeys} />
      </div>

      <h2 className="mt-12 text-[18px] font-medium text-foreground">Developer resources</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {RESOURCES.map((r) => (
          <Link key={r.title} to={r.to} className="console-card group flex flex-col p-5">
            <p className="flex items-center justify-between text-[16px] font-medium text-foreground">
              <span className="flex items-center gap-2">
                {r.live ? (
                  <span className="relative flex h-2.5 w-2.5" aria-hidden="true">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-60" />
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
                  </span>
                ) : (
                  <r.icon className="h-4 w-4" aria-hidden="true" />
                )}
                {r.title}
              </span>
              <ArrowUpRight className="h-4 w-4 opacity-60 transition group-hover:opacity-100" aria-hidden="true" />
            </p>
            {r.mono ? (
              <code className="mt-3 block rounded-md border border-border bg-muted px-2.5 py-1.5 font-mono text-[13px] text-foreground">{r.mono}</code>
            ) : null}
            <p className="mt-2 text-[14px] leading-relaxed text-muted-foreground">{r.text}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
