import * as React from "react";
import { Link } from "@tanstack/react-router";
import { Check, Copy } from "lucide-react";
import { PUBLIC_API_MODEL_IDS } from "@/lib/public-api-models";

/* Homepage "For developers" section (replaces "What you're working with").
   Code samples target the real Jenvu OpenAI-compatible endpoint. */

const BASE = "https://jenvu.com/api/public/v1";
const MODEL = "gpt-5.5";

type Lang = "py" | "ts" | "sh";
const TABS: { id: string; label: string; lang: Lang; code: string }[] = [
  {
    id: "python",
    label: "Python",
    lang: "py",
    code: `import os
from openai import OpenAI
client = OpenAI(
    base_url="${BASE}",
    api_key=os.getenv("JENVU_API_KEY")
)
chat = client.chat.completions.create(
    model="${MODEL}",
    messages=[{"role": "user", "content": "Explain gold liquidity"}]
)
print(chat.choices[0].message.content)`,
  },
  {
    id: "typescript",
    label: "TypeScript",
    lang: "ts",
    code: `import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { generateText } from "ai";
const jenvu = createOpenAICompatible({ name: "jenvu", baseURL: "${BASE}" });
const { text } = await generateText({
  model: jenvu("${MODEL}"),
  prompt: "Explain gold liquidity",
});
console.log(text);`,
  },
  {
    id: "openai-sdk",
    label: "TypeScript (OpenAI SDK)",
    lang: "ts",
    code: `import OpenAI from "openai";
const client = new OpenAI({
  baseURL: "${BASE}",
  apiKey: process.env.JENVU_API_KEY,
});
const chat = await client.chat.completions.create({
  model: "${MODEL}",
  messages: [{ role: "user", content: "Explain gold liquidity" }],
});
console.log(chat.choices[0].message.content);`,
  },
  {
    id: "curl",
    label: "cURL",
    lang: "sh",
    code: `curl ${BASE}/chat/completions \\
  -H "Authorization: Bearer $JENVU_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "${MODEL}",
    "messages": [{"role": "user", "content": "Explain gold liquidity"}]
  }'`,
  },
];

const KEYWORDS: Record<Lang, Set<string>> = {
  py: new Set(["import", "from", "as", "def", "return", "None", "True", "False"]),
  ts: new Set(["import", "from", "const", "await", "new", "async", "return", "let"]),
  sh: new Set(["curl"]),
};

/* Tiny highlighter: strings, keywords, kwargs, calls, flags. */
function highlight(line: string, lang: Lang): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  const re = /("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|\$[A-Z_]+|-[A-Za-z]\b|[A-Za-z_][A-Za-z0-9_]*|\s+|.)/g;
  const parts = line.match(re) ?? [];
  parts.forEach((p, i) => {
    const next = parts.slice(i + 1).find((x) => !/^\s+$/.test(x));
    let cls = "";
    if (/^["']/.test(p)) cls = "dev-code-str";
    else if (KEYWORDS[lang].has(p)) cls = "dev-code-kw";
    else if (lang === "sh" && /^-[A-Za-z]$/.test(p)) cls = "dev-code-param";
    else if (/^\$[A-Z_]+$/.test(p)) cls = "dev-code-str";
    else if (lang === "py" && next === "=" && /^[a-z_]+$/.test(p) && i > 0 && /^\s+$/.test(parts[i - 1] ?? "")) cls = "dev-code-param";
    else if (/^[A-Za-z_]/.test(p) && next === "(" && p !== "OpenAI") cls = p === "print" ? "dev-code-builtin" : "dev-code-fn";
    out.push(cls ? <span key={i} className={cls}>{p}</span> : <React.Fragment key={i}>{p}</React.Fragment>);
  });
  return out;
}

const METRICS: [string, string][] = [
  [`${Math.floor(PUBLIC_API_MODEL_IDS.length / 10) * 10}+`, "Models available"],
  ["$3", "Per 1M tokens"],
  ["1", "Key for everything"],
];

export function DevApiSection() {
  const [tab, setTab] = React.useState(TABS[0].id);
  const [copied, setCopied] = React.useState(false);
  const active = TABS.find((t) => t.id === tab) ?? TABS[0];

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(active.code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked — ignore */
    }
  };

  return (
    <section className="px-5 py-24">
      <div className="mx-auto grid max-w-7xl items-center gap-14 lg:grid-cols-[1fr_1.15fr]">
        <div>
          <p className="text-[14px] text-muted-foreground">For developers</p>
          <h2 className="mt-4 text-[40px] font-medium leading-[1.05] tracking-tight text-foreground sm:text-[48px]">
            One API.
            <br />
            Every modality.
          </h2>
          <p className="mt-5 max-w-md text-[17px] leading-relaxed text-foreground/80">
            Text, code, voice, images, and video — all through a single unified API. Start building in seconds.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to="/dashboard/api"
              className="inline-flex h-10 items-center rounded-full bg-foreground px-5 text-[14px] font-medium text-background transition hover:opacity-90"
            >
              Get API Key
            </Link>
            <Link
              to="/docs"
              className="inline-flex h-10 items-center rounded-full bg-gc-surface px-5 text-[14px] font-medium text-foreground transition hover:brightness-95"
            >
              Read Docs
            </Link>
          </div>
          <dl className="mt-10 flex flex-wrap gap-x-7 gap-y-4 sm:gap-x-10">
            {METRICS.map(([v, l]) => (
              <div key={l}>
                <dt className="text-[15px] font-medium text-foreground">{v}</dt>
                <dd className="mt-0.5 text-[12px] text-muted-foreground">{l}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="min-w-0">
          <div className="dev-api-frame relative px-5 py-10 sm:px-11 sm:py-12">
            <span aria-hidden className="dev-api-notch left-0 top-0" />
            <span aria-hidden className="dev-api-notch right-0 top-0" />
            <span aria-hidden className="dev-api-notch bottom-0 left-0" />
            <span aria-hidden className="dev-api-notch bottom-0 right-0" />
            <div className="dev-code-card relative overflow-hidden rounded-[12px]">
              <div className="dev-code-bar flex items-center justify-between px-4 py-3">
                <div className="flex gap-1.5">
                  <span className="dev-dot dev-dot-r" />
                  <span className="dev-dot dev-dot-y" />
                  <span className="dev-dot dev-dot-g" />
                </div>
                <button type="button" onClick={copy} className="dev-code-copy inline-flex items-center gap-1 text-[12px]">
                  {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
              <pre className="dev-code-body h-[285px] overflow-auto px-4 py-4 font-mono text-[12.5px] leading-[1.75]">
                {active.code.split("\n").map((ln, i) => (
                  <div key={`${active.id}-${i}`} className="whitespace-pre">
                    {ln ? highlight(ln, active.lang) : " "}
                  </div>
                ))}
              </pre>
            </div>
          </div>
          <div className="mt-4 flex gap-2 overflow-x-auto [scrollbar-width:none]">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`shrink-0 rounded-full border px-3.5 py-1.5 text-[13.5px] font-normal transition ${
                  t.id === tab
                    ? "border-gc-line bg-gc-surface text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
