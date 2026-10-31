import { createFileRoute, Link } from "@tanstack/react-router";
import * as React from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  Copy,
  Eye,
  Gauge,
  KeyRound,
  Layers,
  LineChart,
  Lock,
  MessageSquare,
  Play,
  ShieldCheck,
  Sparkles,
  Terminal,
  Zap,
} from "lucide-react";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";

export const Route = createFileRoute("/platform")({
  head: () => ({
    meta: [
      { title: "Jenvu API Platform — Build AI products on Jenvu" },
      {
        name: "description",
        content:
          "One OpenAI-compatible API key for leading AI models and gold market intelligence. Pay only for the tokens you use.",
      },
      { property: "og:title", content: "Jenvu API Platform — Build AI products on Jenvu" },
      {
        property: "og:description",
        content: "Leading AI models behind one OpenAI-compatible endpoint. Pay as you go from $3 per million tokens.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:url", content: "https://jenvu.com/platform" },
    ],
    links: [{ rel: "canonical", href: "https://jenvu.com/platform" }],
  }),
  component: PlatformPage,
});

const BASE = "https://jenvu.com/api/public/v1";
const SIGN_IN = "https://auth.jenvu.com/sign-in";

type Lang = "curl" | "python" | "node";

const SNIPPETS: Record<Lang, string> = {
  curl: `curl ${BASE}/chat/completions \\
  -H "Authorization: Bearer $JENVU_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "jenvu-fast",
    "messages": [
      {"role": "user", "content": "Explain a liquidity sweep on XAU/USD"}
    ]
  }'`,
  python: `from openai import OpenAI

client = OpenAI(
    base_url="${BASE}",
    api_key=JENVU_API_KEY,
)

res = client.chat.completions.create(
    model="jenvu-fast",
    messages=[{"role": "user", "content": "Explain a liquidity sweep on XAU/USD"}],
)
print(res.choices[0].message.content)`,
  node: `import OpenAI from "openai";

const client = new OpenAI({
  baseURL: "${BASE}",
  apiKey: process.env.JENVU_API_KEY,
});

const res = await client.chat.completions.create({
  model: "jenvu-fast",
  messages: [{ role: "user", content: "Explain a liquidity sweep on XAU/USD" }],
});
console.log(res.choices[0].message.content);`,
};

const LANG_LABEL: Record<Lang, string> = { curl: "cURL", python: "Python", node: "Node.js" };

const PROMPTS = [
  {
    q: "Explain a liquidity sweep on XAU/USD",
    a: "A liquidity sweep happens when price briefly trades beyond a recent high or low, triggers resting stop orders, then closes back inside the range. On gold, traders watch for a closed candle back inside the level before treating the move as a sweep rather than a breakout.",
  },
  {
    q: "Write a product description for a trading journal app",
    a: "Track every trade in one place. Log entries, exits and screenshots, tag your setups, and see which sessions and patterns work best for you — with clear weekly reviews that keep your process honest.",
  },
  {
    q: "Summarise this support ticket in one line",
    a: "Customer cannot register a new RDP IP because an old account-only licence is using their slot; they need the old row reused or removed.",
  },
];

const MODELS = [
  {
    id: "jenvu-fast",
    icon: Zap,
    name: "Jenvu Fast",
    body: "Quick, low-cost answers for chat, summaries and everyday automation.",
    tags: ["Chat", "Summaries", "Low latency"],
  },
  {
    id: "jenvu-pro",
    icon: Sparkles,
    name: "Jenvu Pro",
    body: "Deeper reasoning for analysis, long documents and multi-step tasks.",
    tags: ["Reasoning", "Long context", "Analysis"],
  },
  {
    id: "jenvu-vision",
    icon: Eye,
    name: "Jenvu Vision",
    body: "Send images with your prompt — charts, screenshots and documents.",
    tags: ["Images", "Charts", "Documents"],
  },
];

const CAPABILITIES = [
  { icon: Layers, title: "Leading models, one key", body: "Call the models you need through a single endpoint — no separate provider accounts." },
  { icon: Terminal, title: "OpenAI-compatible", body: "Keep your OpenAI SDK. Change the base URL and key, and your code keeps working." },
  { icon: LineChart, title: "Built for markets", body: "Ask about gold structure, sessions and ICT/SMC ideas with market-aware answers." },
  { icon: Gauge, title: "Usage you can see", body: "Tokens, requests and spend per key, live in your dashboard." },
];

const STEPS = [
  { n: "01", title: "Create an account", body: "Sign up and open API Keys in your dashboard." },
  { n: "02", title: "Generate a key", body: "Create a secret key and keep it on your server." },
  { n: "03", title: "Make your first call", body: "Send a request with any OpenAI SDK and ship." },
];

function useTyping(text: string, run: number) {
  const [out, setOut] = React.useState("");
  React.useEffect(() => {
    if (run === 0) {
      setOut(text);
      return;
    }
    setOut("");
    let i = 0;
    const id = window.setInterval(() => {
      i += 3;
      setOut(text.slice(0, i));
      if (i >= text.length) window.clearInterval(id);
    }, 18);
    return () => window.clearInterval(id);
  }, [text, run]);
  return out;
}

function Playground() {
  const [idx, setIdx] = React.useState(0);
  const [run, setRun] = React.useState(0);
  const out = useTyping(PROMPTS[idx].a, run);
  const typing = run > 0 && out.length < PROMPTS[idx].a.length;

  return (
    <div className="overflow-hidden rounded-3xl border border-gc-night-soft bg-gc-night text-gc-on-night shadow-2xl">
      <div className="flex items-center justify-between border-b border-gc-night-soft px-5 py-3">
        <div className="flex items-center gap-2 text-xs text-gc-on-night-muted">
          <span className="h-2.5 w-2.5 rounded-full bg-gc-red" />
          <span className="h-2.5 w-2.5 rounded-full bg-gc-yellow" />
          <span className="h-2.5 w-2.5 rounded-full bg-gc-green" />
          <span className="ml-3 font-mono">POST /v1/chat/completions</span>
        </div>
        <span className="rounded-full border border-gc-night-soft px-2.5 py-0.5 font-mono text-[11px] text-gc-on-night-muted">
          jenvu-fast
        </span>
      </div>

      <div className="space-y-5 p-5 sm:p-6">
        <div className="flex flex-wrap gap-2">
          {PROMPTS.map((p, i) => (
            <button
              key={p.q}
              type="button"
              onClick={() => {
                setIdx(i);
                setRun((r) => r + 1);
              }}
              className={`rounded-full border px-3 py-1.5 text-left text-xs transition-colors ${
                i === idx
                  ? "border-gc-on-night bg-gc-on-night text-gc-night"
                  : "border-gc-night-soft text-gc-on-night-muted hover:text-gc-on-night"
              }`}
            >
              {p.q}
            </button>
          ))}
        </div>

        <div className="rounded-2xl bg-gc-night-soft p-4">
          <p className="text-[11px] font-medium uppercase tracking-wider text-gc-on-night-muted">User</p>
          <p className="mt-1.5 text-sm">{PROMPTS[idx].q}</p>
        </div>

        <div className="min-h-[132px] rounded-2xl border border-gc-night-soft p-4">
          <p className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-gc-on-night-muted">
            <MessageSquare className="h-3 w-3" /> Assistant
          </p>
          <p className="mt-1.5 text-sm leading-relaxed">
            {out}
            {typing && <span className="ml-0.5 inline-block h-4 w-1.5 translate-y-0.5 animate-pulse bg-gc-on-night" />}
          </p>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-[11px] text-gc-on-night-muted">Sample output for illustration</span>
          <button
            type="button"
            onClick={() => setRun((r) => r + 1)}
            className="inline-flex items-center gap-1.5 rounded-full bg-gc-on-night px-3.5 py-1.5 text-xs font-medium text-gc-night hover:opacity-90"
          >
            <Play className="h-3 w-3" /> Run
          </button>
        </div>
      </div>
    </div>
  );
}

function CodeBlock() {
  const [lang, setLang] = React.useState<Lang>("curl");
  const [copied, setCopied] = React.useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(SNIPPETS[lang]);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable */
    }
  };
  return (
    <div className="overflow-hidden rounded-3xl border border-gc-night-soft bg-gc-night text-gc-on-night">
      <div className="flex items-center justify-between border-b border-gc-night-soft px-3 py-2">
        <div className="flex gap-1">
          {(Object.keys(SNIPPETS) as Lang[]).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setLang(k)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
                lang === k ? "bg-gc-night-soft text-gc-on-night" : "text-gc-on-night-muted hover:text-gc-on-night"
              }`}
            >
              {LANG_LABEL[k]}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={copy}
          className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs text-gc-on-night-muted hover:text-gc-on-night"
        >
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="overflow-x-auto p-5 text-left font-mono text-[13px] leading-relaxed">
        <code>{SNIPPETS[lang]}</code>
      </pre>
    </div>
  );
}

function PlatformPage() {
  return (
    <div className="min-h-screen bg-background text-gc-ink">
      <SiteHeader />

      {/* Hero */}
      <section className="mx-auto grid max-w-7xl items-center gap-12 px-5 pb-20 pt-16 sm:pt-24 lg:grid-cols-[1.05fr_1fr]">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-gc-line px-3 py-1 text-xs font-medium text-gc-ink-muted">
            <span className="h-1.5 w-1.5 rounded-full bg-gc-green" /> Jenvu API Platform · REST v1
          </span>
          <h1 className="mt-6 text-5xl font-semibold leading-[1.04] tracking-tight sm:text-6xl lg:text-7xl">
            Build leading AI products on Jenvu
          </h1>
          <p className="mt-6 max-w-xl text-lg text-gc-ink-muted">
            One OpenAI-compatible key for leading AI models and market intelligence. Pay only for the tokens you use.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <a
              href={SIGN_IN}
              className="inline-flex items-center gap-2 rounded-full bg-gc-ink px-6 py-3 text-sm font-medium text-background hover:opacity-90"
            >
              Get your API key <ArrowRight className="h-4 w-4" />
            </a>
            <Link
              to="/docs"
              className="inline-flex items-center gap-2 rounded-full border border-gc-line px-6 py-3 text-sm font-medium hover:bg-gc-surface"
            >
              Read the docs <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
          <dl className="mt-12 grid max-w-md grid-cols-3 gap-6 border-t border-gc-line pt-6">
            <div>
              <dt className="text-xs text-gc-ink-muted">Price</dt>
              <dd className="mt-1 text-xl font-semibold">$3 / 1M</dd>
            </div>
            <div>
              <dt className="text-xs text-gc-ink-muted">SDKs</dt>
              <dd className="mt-1 text-xl font-semibold">OpenAI</dd>
            </div>
            <div>
              <dt className="text-xs text-gc-ink-muted">Billing</dt>
              <dd className="mt-1 text-xl font-semibold">Pay as you go</dd>
            </div>
          </dl>
        </div>
        <Playground />
      </section>

      {/* Models */}
      <section className="border-t border-gc-line bg-gc-surface py-24">
        <div className="mx-auto max-w-7xl px-5">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <p className="text-sm font-medium text-gc-blue">Models</p>
              <h2 className="mt-3 max-w-2xl text-4xl font-semibold tracking-tight sm:text-5xl">
                Pick the right model for the job
              </h2>
            </div>
            <Link to="/docs" className="inline-flex items-center gap-1.5 text-sm font-medium hover:underline">
              All models <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {MODELS.map((m) => (
              <div
                key={m.id}
                className="group flex flex-col rounded-3xl border border-gc-line bg-background p-7 transition-shadow hover:shadow-lg"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gc-blue-soft text-gc-blue">
                  <m.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-6 text-xl font-semibold">{m.name}</h3>
                <code className="mt-1 font-mono text-xs text-gc-ink-muted">{m.id}</code>
                <p className="mt-4 flex-1 text-sm text-gc-ink-muted">{m.body}</p>
                <div className="mt-6 flex flex-wrap gap-2">
                  {m.tags.map((t) => (
                    <span key={t} className="rounded-full border border-gc-line px-2.5 py-1 text-xs text-gc-ink-muted">
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Developer experience */}
      <section className="mx-auto grid max-w-7xl items-center gap-12 px-5 py-24 lg:grid-cols-2">
        <div>
          <p className="text-sm font-medium text-gc-blue">Developer experience</p>
          <h2 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">Ship with the SDK you already use</h2>
          <p className="mt-5 max-w-lg text-gc-ink-muted">
            Point the OpenAI SDK at Jenvu, add your key, and you're live. No new client library, no rewrite.
          </p>
          <ul className="mt-8 space-y-3 text-sm">
            {["Works with OpenAI Python and Node.js SDKs", "Chat completions with text and images", "Clear errors with standard HTTP status codes"].map(
              (t) => (
                <li key={t} className="flex items-center gap-3">
                  <Check className="h-4 w-4 text-gc-green" /> {t}
                </li>
              ),
            )}
          </ul>
        </div>
        <CodeBlock />
      </section>

      {/* Capabilities bento */}
      <section className="border-t border-gc-line py-24">
        <div className="mx-auto max-w-7xl px-5">
          <h2 className="max-w-2xl text-4xl font-semibold tracking-tight sm:text-5xl">Everything you need to build</h2>
          <div className="mt-12 grid gap-5 md:grid-cols-6">
            {CAPABILITIES.map((c, i) => (
              <div
                key={c.title}
                className={`rounded-3xl border border-gc-line p-8 ${
                  i === 0 || i === 3 ? "md:col-span-4 bg-gc-surface" : "md:col-span-2 bg-background"
                }`}
              >
                <c.icon className="h-6 w-6 text-gc-blue" />
                <h3 className="mt-8 text-xl font-semibold">{c.title}</h3>
                <p className="mt-2 max-w-md text-sm text-gc-ink-muted">{c.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Security */}
      <section className="bg-gc-night py-24 text-gc-on-night">
        <div className="mx-auto grid max-w-7xl gap-12 px-5 lg:grid-cols-[1fr_1.2fr]">
          <div>
            <p className="text-sm font-medium text-gc-on-night-muted">Security & control</p>
            <h2 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">Your keys, your data, your rules</h2>
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            {[
              { icon: Lock, t: "Private by default", b: "Your API requests are not used to train models." },
              { icon: KeyRound, t: "Revoke any time", b: "Create, rotate and delete keys from your dashboard." },
              { icon: ShieldCheck, t: "Scoped to you", b: "Each key is tied to your account and its own credit." },
              { icon: Gauge, t: "Spend visibility", b: "See tokens and cost per key before bills surprise you." },
            ].map((x) => (
              <div key={x.t} className="rounded-3xl border border-gc-night-soft p-6">
                <x.icon className="h-5 w-5" />
                <h3 className="mt-5 font-semibold">{x.t}</h3>
                <p className="mt-2 text-sm text-gc-on-night-muted">{x.b}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Steps */}
      <section className="mx-auto max-w-7xl px-5 py-24">
        <h2 className="text-4xl font-semibold tracking-tight sm:text-5xl">Start in minutes</h2>
        <div className="mt-12 grid gap-10 sm:grid-cols-3">
          {STEPS.map((s) => (
            <div key={s.n} className="border-t-2 border-gc-ink pt-6">
              <p className="font-mono text-sm text-gc-ink-muted">{s.n}</p>
              <h3 className="mt-3 text-xl font-semibold">{s.title}</h3>
              <p className="mt-2 text-sm text-gc-ink-muted">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section className="border-t border-gc-line bg-gc-surface py-24">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-5 md:grid-cols-2">
          <div>
            <p className="text-sm font-medium text-gc-blue">Pricing</p>
            <h2 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">Simple, usage-based</h2>
            <p className="mt-5 max-w-md text-gc-ink-muted">
              Pay from your AI credit. No minimums and no setup fees.
            </p>
            <Link to="/pricing" className="mt-7 inline-flex items-center gap-2 text-sm font-medium text-gc-blue hover:underline">
              See plans <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="rounded-3xl border border-gc-line bg-background p-8">
            <p className="text-sm text-gc-ink-muted">All models</p>
            <p className="mt-2 text-5xl font-semibold tracking-tight">
              $3<span className="text-lg font-normal text-gc-ink-muted"> / million tokens</span>
            </p>
            <ul className="mt-8 space-y-3 text-sm">
              {["Usage tracked per key", "Rotate or revoke keys any time", "Shares credit with your Jenvu plan"].map((t) => (
                <li key={t} className="flex items-center gap-3">
                  <Check className="h-4 w-4 text-gc-green" /> {t}
                </li>
              ))}
            </ul>
            <a
              href={SIGN_IN}
              className="mt-8 flex w-full items-center justify-center gap-2 rounded-full bg-gc-ink px-6 py-3 text-sm font-medium text-background hover:opacity-90"
            >
              Get your API key <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-5 py-24">
        <div className="rounded-[2rem] bg-gc-night px-6 py-20 text-center text-gc-on-night">
          <h2 className="mx-auto max-w-2xl text-4xl font-semibold tracking-tight sm:text-5xl">Start building with Jenvu</h2>
          <p className="mx-auto mt-4 max-w-xl text-gc-on-night-muted">Create a key and make your first request today.</p>
          <div className="mt-9 flex flex-wrap justify-center gap-3">
            <a
              href={SIGN_IN}
              className="inline-flex items-center gap-2 rounded-full bg-gc-on-night px-6 py-3 text-sm font-medium text-gc-night hover:opacity-90"
            >
              Get started <ArrowRight className="h-4 w-4" />
            </a>
            <Link
              to="/docs"
              className="inline-flex items-center gap-2 rounded-full border border-gc-night-soft px-6 py-3 text-sm font-medium hover:bg-gc-night-soft"
            >
              Read the docs
            </Link>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
