import * as React from "react";
import { Link } from "@tanstack/react-router";
import { ArrowUpRight, Check, ChevronRight, Copy, DollarSign, Eye, Code2, MessageSquare, Waves } from "lucide-react";
import { highlight } from "@/components/dashboard/CodeHighlight";
import { MODEL_CATALOG, PRICE_PER_MILLION, formatContext } from "@/lib/model-catalog";

export const API_BASE = "https://jenvu.com/api/public/v1";
const DEFAULT_MODEL = "deepseek-v3.2";

export type CodeSample = { label: string; code: string };

export const HELLO_SAMPLES: CodeSample[] = [
  {
    label: "JavaScript",
    code: `import OpenAI from "openai";

const client = new OpenAI({
  baseURL: "${API_BASE}",
  apiKey: process.env.JENVU_API_KEY,
});

const res = await client.chat.completions.create({
  model: "${DEFAULT_MODEL}",
  messages: [{ role: "user", content: "Fix this function and explain the bug: function median(a){a.sort();return a[a.length/2]}" }],
});

console.log(res.choices[0].message.content);`,
  },
  {
    label: "Python (OpenAI)",
    code: `from openai import OpenAI

client = OpenAI(base_url="${API_BASE}", api_key="JENVU_API_KEY")

res = client.chat.completions.create(
    model="${DEFAULT_MODEL}",
    messages=[{"role": "user", "content": "Summarize today's XAU/USD structure."}],
)
print(res.choices[0].message.content)`,
  },
  {
    label: "cURL",
    code: `curl ${API_BASE}/chat/completions \\
  -H "Authorization: Bearer $JENVU_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "${DEFAULT_MODEL}",
    "messages": [{"role": "user", "content": "Explain a liquidity sweep."}]
  }'`,
  },
];

/** Dark code panel with language tabs and a copy button; scrolls sideways on phones. */
export function CodeTabs({ samples, className = "" }: { samples: CodeSample[]; className?: string }) {
  const [i, setI] = React.useState(0);
  const [copied, setCopied] = React.useState(false);
  const s = samples[Math.min(i, samples.length - 1)];
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(s.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      /* clipboard blocked */
    }
  };
  return (
    <div className={`docs-code min-w-0 overflow-hidden rounded-2xl ${className}`}>
      <div className="docs-code-bar flex items-center gap-1 overflow-x-auto px-3 py-2.5 sm:px-4">
        {samples.map((x, k) => (
          <button
            key={x.label}
            type="button"
            onClick={() => setI(k)}
            aria-pressed={k === i}
            className={`shrink-0 rounded-md px-2.5 py-1 text-[13px] transition ${k === i ? "docs-code-tab-on" : "docs-code-tab"}`}
          >
            {x.label}
          </button>
        ))}
        <button type="button" onClick={copy} aria-label="Copy code" className="docs-code-tab ml-auto shrink-0 rounded-md p-1.5">
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        </button>
      </div>
      <pre className="overflow-x-auto px-4 py-5 font-mono text-[12.5px] leading-[1.7] sm:px-5 sm:text-[13px]">
        <code>{highlight(s.code)}</code>
      </pre>
    </div>
  );
}

function Pill({ to, children, solid }: { to: string; children: React.ReactNode; solid?: boolean }) {
  const cls = solid
    ? "inline-flex h-10 items-center gap-1.5 rounded-full bg-foreground px-5 text-[14px] font-medium text-background transition hover:opacity-90"
    : "inline-flex h-10 items-center gap-1.5 rounded-full border border-gc-line bg-background px-5 text-[14px] font-medium text-gc-ink transition hover:bg-gc-surface";
  if (to.startsWith("#")) return <a href={to} className={cls}>{children}</a>;
  return <Link to={to} className={cls}>{children}</Link>;
}

const FLAGSHIP = MODEL_CATALOG.find((m) => m.id === DEFAULT_MODEL) ?? MODEL_CATALOG[0];
const CODER = MODEL_CATALOG.find((m) => m.id === "qwen3-coder-480b") ?? MODEL_CATALOG[1];
const VISION = MODEL_CATALOG.find((m) => m.capabilities.includes("vision")) ?? MODEL_CATALOG[2];
const price = `$${PRICE_PER_MILLION.toFixed(2)} / 1M tokens`;

const MODEL_CARDS = [
  {
    title: FLAGSHIP.name,
    badge: "Default",
    id: FLAGSHIP.id,
    icon: <MessageSquare className="h-5 w-5" />,
    text: FLAGSHIP.description,
    rows: [["Context", `${formatContext(FLAGSHIP.context)} tokens`], ["Input", price], ["Output", price], ["Streaming", "Supported"]],
  },
  {
    title: CODER.name,
    badge: "Coding",
    id: CODER.id,
    icon: <Code2 className="h-5 w-5" />,
    text: CODER.description,
    rows: [["Context", `${formatContext(CODER.context)} tokens`], ["Input", price], ["Output", price], ["Tools", "Function calling"]],
  },
  {
    title: VISION.name,
    badge: "Vision",
    id: VISION.id,
    icon: <Eye className="h-5 w-5" />,
    text: VISION.description,
    rows: [["Context", `${formatContext(VISION.context)} tokens`], ["Input", price], ["Output", price], ["Images", "Charts & screenshots"]],
  },
];

const SWITCH = {
  Code: {
    title: "Coding models",
    text: "Refactor, debug and review code with the Qwen3 Coder, Devstral and GLM families.",
    points: ["Agent-ready tool calling", "Works with any OpenAI SDK", "Long context for big files"],
    model: "qwen3-coder-480b",
    prompt: "Refactor this function and add tests.",
  },
  Text: {
    title: "Chat completions",
    text: "One endpoint for writing, analysis and Q&A — change the model name to switch.",
    points: ["Same request shape for every model", "Streaming replies", "JSON answers on request"],
    model: DEFAULT_MODEL,
    prompt: "Write a short market recap for XAU/USD.",
  },
  Vision: {
    title: "Image understanding",
    text: "Send a chart or screenshot with your question and get a written answer back.",
    points: ["Reads charts and screenshots", "Mix text and images in one message", "Same endpoint"],
    model: VISION.id,
    prompt: "What does this chart show?",
  },
  Streaming: {
    title: "Streaming",
    text: 'Set "stream": true to get tokens as they are written, ideal for chat UIs.',
    points: ["Server-sent events", "Works with SDK stream helpers", "Same pricing"],
    model: DEFAULT_MODEL,
    prompt: "Explain an order block step by step.",
  },
} as const;
type SwitchKey = keyof typeof SWITCH;

function switchSample(k: SwitchKey): CodeSample[] {
  const s = SWITCH[k];
  const stream = k === "Streaming";
  return [
    {
      label: "JavaScript",
      code: `const res = await client.chat.completions.create({
  model: "${s.model}",${stream ? "\n  stream: true," : ""}
  messages: [{ role: "user", content: "${s.prompt}" }],
});
${stream ? "for await (const part of res) process.stdout.write(part.choices[0]?.delta?.content ?? \"\");" : "console.log(res.choices[0].message.content);"}`,
    },
    {
      label: "Python",
      code: `res = client.chat.completions.create(
    model="${s.model}",${stream ? "\n    stream=True," : ""}
    messages=[{"role": "user", "content": "${s.prompt}"}],
)
${stream ? "for part in res:\n    print(part.choices[0].delta.content or \"\", end=\"\")" : "print(res.choices[0].message.content)"}`,
    },
  ];
}

const EXPLORE: { title: string; links: [string, string][] }[] = [
  { title: "Get started", links: [["Create an API key", "/dashboard/api"], ["Quickstart guide", "#quickstart"], ["Models", "/models"], ["Pricing", "#api-pricing"]] },
  { title: "Platform", links: [["Terminal", "#terminal-access"], ["JX Bot for MT5", "#jx-bot"], ["AI chat", "#ai-chat"], ["Alerts", "#alerts"]] },
  { title: "Resources", links: [["API keys", "#api"], ["Connect AI assistants", "#ai-assistants"], ["Glossary A to Z", "#glossary"], ["Contact support", "/contact"]] },
];

export const OVERVIEW_TOC = [
  { id: "docs-overview", title: "Overview" },
  { id: "models-list", title: "Models" },
  { id: "jump-in", title: "Jump straight in" },
  { id: "explore", title: "Explore the docs" },
  { id: "quickstart", title: "Quickstart" },
  { id: "api-pricing", title: "Pricing" },
];

export function DocsOverview() {
  const [tab, setTab] = React.useState<SwitchKey>("Code");
  const sw = SWITCH[tab];
  const pricingRows = MODEL_CATALOG.slice(0, 10);

  return (
    <div className="space-y-16 sm:space-y-20">
      {/* Hero */}
      <section id="docs-overview" className="scroll-mt-24 rounded-[28px] bg-gc-surface p-5 sm:p-8 lg:p-12">
        <div className="grid items-center gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-10">
          <div className="min-w-0">
            <h1 className="text-[36px] font-medium leading-[1.08] tracking-[-0.8px] text-gc-ink sm:text-[48px] lg:text-[54px]">
              Get started <span className="text-gc-ink-muted">with</span> Jenvu <span className="text-gc-ink-muted">Intelligence</span>
            </h1>
            <p className="mt-5 max-w-[460px] text-[16px] leading-[1.65] text-gc-ink sm:text-[18px]">
              Build with the Jenvu API: fast, cost-effective models for code, text and images — plus guides for the Terminal and JX Bot.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Pill to="/dashboard/api" solid>Create API key <ChevronRight className="h-4 w-4" /></Pill>
              <Pill to="#quickstart">Get Started</Pill>
            </div>
          </div>
          <CodeTabs samples={HELLO_SAMPLES} />
        </div>
      </section>

      {/* Models */}
      <section id="models-list" className="scroll-mt-24">
        <h2 className="text-[30px] font-medium tracking-[-0.4px] text-gc-ink sm:text-[34px]">Models</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {MODEL_CARDS.map((c) => (
            <article key={c.id} className="flex min-w-0 flex-col rounded-[22px] bg-gc-surface p-6">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-[20px] font-medium text-gc-ink">{c.title}</h3>
                    <span className="rounded-full border border-gc-line px-2 py-0.5 text-[12px] text-gc-ink-muted">{c.badge}</span>
                  </div>
                  <code className="mt-1 block font-mono text-[12px] text-gc-ink-muted">{c.id}</code>
                </div>
                <span className="text-gc-ink-muted">{c.icon}</span>
              </div>
              <p className="mt-4 text-[15px] leading-[1.6] text-gc-ink">{c.text}</p>
              <dl className="mt-5 flex-1 divide-y divide-gc-line text-[14px]">
                {c.rows.map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between gap-3 py-3">
                    <dt className="text-gc-ink-muted">{k}</dt>
                    <dd className="text-right text-gc-ink">{v}</dd>
                  </div>
                ))}
              </dl>
              <div className="mt-5 flex flex-wrap gap-2">
                <Pill to="/models" solid>View model</Pill>
                <Pill to="/dashboard/chat">Try in playground</Pill>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Jump straight in */}
      <section id="jump-in" className="scroll-mt-24">
        <h2 className="text-[30px] font-medium tracking-[-0.4px] text-gc-ink sm:text-[34px]">Jump straight in</h2>
        <div className="mt-6 rounded-[28px] bg-gc-surface p-4 sm:p-7">
          <div className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1">
            <div className="inline-flex shrink-0 gap-1 rounded-full bg-background p-1">
              {(Object.keys(SWITCH) as SwitchKey[]).map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setTab(k)}
                  aria-pressed={k === tab}
                  className={`rounded-full px-4 py-2 text-[14px] transition ${k === tab ? "bg-foreground font-medium text-background" : "text-gc-ink-muted hover:text-gc-ink"}`}
                >
                  {k}
                </button>
              ))}
            </div>
          </div>
          <div className="mt-5 grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] lg:gap-10">
            <CodeTabs key={tab} samples={switchSample(tab)} />
            <div className="min-w-0 lg:pt-3">
              <h3 className="text-[20px] font-medium text-gc-ink">{sw.title}</h3>
              <p className="mt-2 text-[15px] leading-[1.6] text-gc-ink">{sw.text}</p>
              <ul className="mt-5 space-y-3 border-t border-gc-line pt-5 text-[15px] text-gc-ink">
                {sw.points.map((p) => (
                  <li key={p} className="flex items-center gap-3"><Check className="h-4 w-4 shrink-0 text-gc-ink-muted" /> {p}</li>
                ))}
                <li className="flex items-center gap-3"><DollarSign className="h-4 w-4 shrink-0 text-gc-ink-muted" /> {price} input</li>
                <li className="flex items-center gap-3"><DollarSign className="h-4 w-4 shrink-0 text-gc-ink-muted" /> {price} output</li>
              </ul>
              <div className="mt-6"><Pill to="#api">Read docs</Pill></div>
            </div>
          </div>
        </div>
      </section>

      {/* Explore */}
      <section id="explore" className="scroll-mt-24">
        <h2 className="text-[30px] font-medium tracking-[-0.4px] text-gc-ink sm:text-[34px]">Explore the Jenvu documentation</h2>
        <div className="mt-6 grid gap-8 md:grid-cols-3">
          {EXPLORE.map((g) => (
            <div key={g.title} className="min-w-0">
              <h3 className="border-b border-gc-line pb-3 text-[20px] font-medium text-gc-ink">{g.title}</h3>
              <ul>
                {g.links.map(([label, href]) => (
                  <li key={label} className="border-b border-gc-line">
                    {href.startsWith("#") ? (
                      <a href={href} className="flex items-center justify-between py-3 text-[15px] text-gc-ink-muted hover:text-gc-ink">
                        {label} <ArrowUpRight className="h-3.5 w-3.5" />
                      </a>
                    ) : (
                      <Link to={href} className="flex items-center justify-between py-3 text-[15px] text-gc-ink-muted hover:text-gc-ink">
                        {label} <ArrowUpRight className="h-3.5 w-3.5" />
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* Quickstart */}
      <section id="quickstart" className="scroll-mt-24 max-w-[760px]">
        <p className="text-[14px] text-gc-ink-muted">Quickstart</p>
        <h2 className="mt-1 text-[40px] font-medium leading-tight tracking-[-0.6px] text-gc-ink sm:text-[46px]">Quickstart</h2>
        <div className="mt-5 flex flex-wrap gap-3">
          <Pill to="/dashboard/api" solid>Create API key <ChevronRight className="h-4 w-4" /></Pill>
          <Pill to="/models">See all models <ArrowUpRight className="h-4 w-4" /></Pill>
        </div>
        <p className="mt-6 text-[16px] leading-[1.7] text-gc-ink">
          This guide walks you through the basics of the Jenvu API, from getting an account to making your first request.
        </p>
        <Step n={1} title="Get a Jenvu account">
          Accounts come from the Founding Program. <Link to="/founding" className="underline underline-offset-4">Apply here</Link>, then sign in to your dashboard.
        </Step>
        <Step n={2} title="Generate an API key">
          Create a key on the <Link to="/dashboard/api" className="underline underline-offset-4">API keys page</Link>, then export it as an environment variable.
          <div className="mt-4"><CodeTabs samples={[{ label: "Bash", code: `export JENVU_API_KEY="your_api_key"` }]} /></div>
        </Step>
        <Step n={3} title="Install an SDK">
          The API is OpenAI-compatible, so the official OpenAI SDKs work — only the base URL and key change.
          <div className="mt-4"><CodeTabs samples={[{ label: "JavaScript", code: "npm install openai" }, { label: "Python", code: "pip install openai" }]} /></div>
        </Step>
        <Step n={4} title="Make your first request">
          <div className="mt-4"><CodeTabs samples={HELLO_SAMPLES} /></div>
        </Step>
      </section>

      {/* Pricing */}
      <section id="api-pricing" className="scroll-mt-24">
        <p className="text-[14px] text-gc-ink-muted">Key information</p>
        <h2 className="mt-1 text-[40px] font-medium leading-tight tracking-[-0.6px] text-gc-ink sm:text-[46px]">Pricing</h2>
        <p className="mt-4 text-[16px] text-gc-ink">
          All prices are in USD and use your account credit. Every model has the same flat rate — see the <Link to="/models" className="underline underline-offset-4">models page</Link> for the full list.
        </p>
        <h3 className="mt-8 text-[20px] font-medium text-gc-ink">Text API</h3>
        <p className="text-[15px] text-gc-ink-muted">Prices per 1M tokens</p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[560px] text-[14px]">
            <thead>
              <tr className="border-b border-gc-line text-left text-gc-ink">
                <th className="py-3 pr-4 font-medium">Model</th>
                <th className="py-3 pr-4 text-right font-medium">Context</th>
                <th className="py-3 pr-4 text-right font-medium">Input</th>
                <th className="py-3 text-right font-medium">Output</th>
              </tr>
            </thead>
            <tbody>
              {pricingRows.map((m) => (
                <tr key={m.id} className="border-b border-gc-line">
                  <td className="py-3.5 pr-4">
                    <span className="block font-mono text-gc-ink">{m.id}</span>
                    <span className="text-[12px] text-gc-ink-muted">{m.name}</span>
                  </td>
                  <td className="py-3.5 pr-4 text-right font-mono text-gc-ink">{formatContext(m.context)}</td>
                  <td className="py-3.5 pr-4 text-right font-mono text-gc-ink">${PRICE_PER_MILLION.toFixed(2)}</td>
                  <td className="py-3.5 text-right font-mono text-gc-ink">${PRICE_PER_MILLION.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-[14px] text-gc-ink-muted">
          Showing {pricingRows.length} of {MODEL_CATALOG.length} models. <Link to="/models" className="underline underline-offset-4">View all models</Link>.
        </p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl bg-gc-surface p-5">
            <p className="flex items-center gap-2 text-[16px] font-medium text-gc-ink"><Waves className="h-4 w-4" /> Billing and availability</p>
            <p className="mt-2 text-[14px] leading-[1.6] text-gc-ink-muted">Usage is taken from your credit balance. When credit runs out, requests stop until you top up or your plan renews.</p>
          </div>
          <div className="rounded-2xl bg-gc-surface p-5">
            <p className="text-[16px] font-medium text-gc-ink">Plans</p>
            <p className="mt-2 text-[14px] leading-[1.6] text-gc-ink-muted">Pro, Elite and Ultra include Terminal and API access. <Link to="/pricing" className="underline underline-offset-4">Compare plans</Link>.</p>
          </div>
        </div>
      </section>
    </div>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div className="mt-10">
      <h3 className="text-[26px] font-medium leading-tight tracking-[-0.3px] text-gc-ink sm:text-[30px]">Step {n}: {title}</h3>
      <div className="mt-3 text-[16px] leading-[1.7] text-gc-ink">{children}</div>
    </div>
  );
}
