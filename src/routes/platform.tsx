import { createFileRoute, Link } from "@tanstack/react-router";
import * as React from "react";
import { ArrowRight, Check, Code2, Gauge, KeyRound, Layers, LineChart, ShieldCheck, Zap } from "lucide-react";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";

export const Route = createFileRoute("/platform")({
  head: () => ({
    meta: [
      { title: "Jenvu API Platform — Build AI products on Jenvu" },
      { name: "description", content: "One API key for top AI models, gold market analysis and trading intelligence. OpenAI-compatible, pay as you go." },
      { property: "og:title", content: "Jenvu API Platform" },
      { property: "og:description", content: "Build AI products with one OpenAI-compatible API key. Pay only for the tokens you use." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:url", content: "https://jenvu.com/platform" },
    ],
    links: [{ rel: "canonical", href: "https://jenvu.com/platform" }],
  }),
  component: PlatformPage,
});

const SNIPPETS: Record<string, string> = {
  curl: `curl https://jenvu.com/api/public/v1/chat/completions \\
  -H "Authorization: Bearer $JENVU_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "jenvu-fast",
    "messages": [{"role": "user", "content": "Summarise XAU/USD today"}]
  }'`,
  python: `from openai import OpenAI

client = OpenAI(base_url="https://jenvu.com/api/public/v1", api_key=JENVU_API_KEY)

res = client.chat.completions.create(
    model="jenvu-fast",
    messages=[{"role": "user", "content": "Summarise XAU/USD today"}],
)
print(res.choices[0].message.content)`,
  javascript: `import OpenAI from "openai";

const client = new OpenAI({ baseURL: "https://jenvu.com/api/public/v1", apiKey: process.env.JENVU_API_KEY });

const res = await client.chat.completions.create({
  model: "jenvu-fast",
  messages: [{ role: "user", content: "Summarise XAU/USD today" }],
});
console.log(res.choices[0].message.content);`,
};

const FEATURES = [
  { icon: Layers, title: "Top AI models, one key", body: "Reach leading chat models through a single endpoint without managing multiple providers." },
  { icon: Code2, title: "OpenAI-compatible", body: "Use the OpenAI SDKs you already know. Change the base URL and your key — that's it." },
  { icon: LineChart, title: "Built for markets", body: "Ask about gold structure, sessions and ICT/SMC concepts with context-aware answers." },
  { icon: Gauge, title: "Usage you can see", body: "Track tokens, requests and spend per key from your dashboard in real time." },
  { icon: ShieldCheck, title: "Private by default", body: "Your requests are not used to train models. Keys can be revoked any time." },
  { icon: Zap, title: "Fast responses", body: "Low-latency routing keeps chat and analysis quick for your users." },
];

const STEPS = [
  { n: "01", title: "Create an account", body: "Sign up and open the API page in your dashboard." },
  { n: "02", title: "Generate a key", body: "Create a secret key and store it safely on your server." },
  { n: "03", title: "Make your first call", body: "Send a request with any OpenAI SDK and start building." },
];

function PlatformPage() {
  const [tab, setTab] = React.useState<keyof typeof SNIPPETS>("curl");
  return (
    <div className="min-h-screen bg-background text-gc-ink">
      <SiteHeader />

      <section className="mx-auto max-w-6xl px-5 pb-16 pt-20 text-center sm:pt-28">
        <p className="text-sm font-medium text-gc-blue">Jenvu API Platform</p>
        <h1 className="mx-auto mt-4 max-w-3xl text-4xl font-semibold leading-tight tracking-tight sm:text-6xl">
          Build leading AI products on Jenvu
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg text-gc-ink-muted">
          One API key for top AI models and market intelligence. Pay only for what you use.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <a href="https://auth.jenvu.com/sign-in" className="inline-flex items-center gap-2 rounded-full bg-gc-ink px-6 py-3 text-sm font-medium text-background hover:opacity-90">
            Get your API key <ArrowRight className="h-4 w-4" />
          </a>
          <Link to="/docs" className="inline-flex items-center gap-2 rounded-full border border-gc-line px-6 py-3 text-sm font-medium hover:bg-gc-surface">
            Read the docs
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-5 pb-20">
        <div className="overflow-hidden rounded-2xl border border-gc-line bg-gc-night text-gc-on-night shadow-sm">
          <div className="flex gap-1 border-b border-gc-night-soft px-3 py-2">
            {(Object.keys(SNIPPETS) as (keyof typeof SNIPPETS)[]).map((k) => (
              <button
                key={k}
                onClick={() => setTab(k)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium capitalize ${tab === k ? "bg-gc-night-soft text-gc-on-night" : "text-gc-on-night-muted hover:text-gc-on-night"}`}
              >
                {k}
              </button>
            ))}
          </div>
          <pre className="overflow-x-auto p-5 text-left text-[13px] leading-relaxed"><code>{SNIPPETS[tab]}</code></pre>
        </div>
      </section>

      <section className="border-t border-gc-line bg-gc-surface py-20">
        <div className="mx-auto max-w-6xl px-5">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">Everything you need to ship</h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div key={f.title} className="rounded-2xl border border-gc-line bg-background p-6">
                <f.icon className="h-5 w-5 text-gc-blue" />
                <h3 className="mt-4 font-semibold">{f.title}</h3>
                <p className="mt-2 text-sm text-gc-ink-muted">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-20">
        <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">Start in minutes</h2>
        <div className="mt-10 grid gap-8 sm:grid-cols-3">
          {STEPS.map((s) => (
            <div key={s.n} className="border-t border-gc-ink pt-5">
              <p className="text-sm text-gc-ink-muted">{s.n}</p>
              <h3 className="mt-2 text-lg font-semibold">{s.title}</h3>
              <p className="mt-2 text-sm text-gc-ink-muted">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-t border-gc-line py-20">
        <div className="mx-auto grid max-w-6xl gap-10 px-5 md:grid-cols-2">
          <div>
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">Simple pricing</h2>
            <p className="mt-4 text-gc-ink-muted">Pay as you go from your AI credit. No minimums, no setup fees.</p>
            <Link to="/pricing" className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-gc-blue hover:underline">
              See plans <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <ul className="space-y-3">
            {["$3 per million tokens", "Usage tracked per key", "Revoke or rotate keys any time", "Same credit as your Jenvu plan"].map((t) => (
              <li key={t} className="flex items-center gap-3 rounded-xl border border-gc-line px-4 py-3 text-sm">
                <Check className="h-4 w-4 text-gc-green" /> {t}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-24">
        <div className="rounded-3xl bg-gc-surface px-6 py-14 text-center">
          <KeyRound className="mx-auto h-6 w-6 text-gc-blue" />
          <h2 className="mt-4 text-3xl font-semibold tracking-tight">Ready to build?</h2>
          <p className="mx-auto mt-3 max-w-xl text-gc-ink-muted">Create your key and make your first request today.</p>
          <a href="https://auth.jenvu.com/sign-in" className="mt-7 inline-flex items-center gap-2 rounded-full bg-gc-ink px-6 py-3 text-sm font-medium text-background hover:opacity-90">
            Get started <ArrowRight className="h-4 w-4" />
          </a>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
