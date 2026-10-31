import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Copy, Check, ArrowUpRight, Code2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard/code")({
  head: () => ({
    meta: [
      { title: "Code API · Jenvu Console" },
      { name: "description", content: "Build with Jenvu models from code: REST, Python and Node.js examples." },
      { property: "og:title", content: "Code API · Jenvu Console" },
      { property: "og:description", content: "Build with Jenvu models from code: REST, Python and Node.js examples." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CodePage,
});

const EXAMPLES = {
  "REST API": {
    code: `curl https://jenvu.com/api/v1/chat/completions \\
  -H "Authorization: Bearer $JENVU_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "jenvu-chat",
    "messages": [{"role": "user", "content": "Explain a liquidity sweep."}]
  }'`,
    result: "Returns a JSON chat completion with the model's answer and token usage.",
  },
  Python: {
    code: `from openai import OpenAI

client = OpenAI(base_url="https://jenvu.com/api/v1", api_key="JENVU_API_KEY")
res = client.chat.completions.create(
    model="jenvu-chat",
    messages=[{"role": "user", "content": "Summarize today's XAU/USD structure."}],
)
print(res.choices[0].message.content)`,
    result: "Works with the OpenAI Python SDK — only the base URL and key change.",
  },
  "Node.js": {
    code: `import OpenAI from "openai";

const client = new OpenAI({ baseURL: "https://jenvu.com/api/v1", apiKey: process.env.JENVU_API_KEY });
const res = await client.chat.completions.create({
  model: "jenvu-chat",
  messages: [{ role: "user", content: "Write a code review for this diff." }],
});
console.log(res.choices[0].message.content);`,
    result: "Same compatible API from JavaScript or TypeScript.",
  },
} as const;

type Tab = keyof typeof EXAMPLES;

function CodePage() {
  const [tab, setTab] = useState<Tab>("REST API");
  const [copied, setCopied] = useState(false);
  const ex = EXAMPLES[tab];
  const copy = async () => {
    await navigator.clipboard.writeText(ex.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <section className="mx-auto w-full max-w-[1100px] px-4 py-8 sm:px-6">
      <h1 className="text-[28px] font-medium text-foreground">Code</h1>
      <p className="mt-1 text-[15px] text-muted-foreground">Call Jenvu models from your own code.</p>

      <div className="console-card mt-8 grid overflow-hidden md:grid-cols-[1fr_1.2fr]">
        <div className="flex aspect-[16/10] items-center justify-center md:aspect-auto" style={{ backgroundImage: "var(--platform-aurora-3)" }}>
          <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-background text-foreground">
            <Code2 className="h-8 w-8" aria-hidden="true" />
          </span>
        </div>
        <div className="flex flex-col justify-center p-6 sm:p-8">
          <span className="w-fit rounded-full bg-background px-2.5 py-0.5 text-[12px] font-medium text-foreground">OpenAI-compatible</span>
          <h2 className="mt-3 text-[22px] font-medium text-foreground">Jenvu Chat API</h2>
          <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">One endpoint for every Jenvu model. Use your existing SDK, change the base URL and key.</p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Link to="/dashboard/api" className="console-pill-solid">Get API key</Link>
            <Link to="/dashboard/models" className="console-pill">View models <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" /></Link>
          </div>
        </div>
      </div>

      <h2 className="mt-12 text-[18px] font-medium text-foreground">API usage examples</h2>
      <div className="mt-4 flex flex-wrap gap-2">
        {(Object.keys(EXAMPLES) as Tab[]).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={t === tab ? "console-pill-solid" : "console-pill"}>{t}</button>
        ))}
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <div className="console-card relative p-5">
          <button onClick={copy} aria-label="Copy code" className="absolute right-3 top-3 rounded-md p-1.5 text-muted-foreground hover:text-foreground">
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          </button>
          <pre className="overflow-x-auto pr-8 text-[13px] leading-relaxed text-foreground"><code>{ex.code}</code></pre>
        </div>
        <div className="console-card p-5">
          <p className="text-[14px] font-medium text-foreground">Result</p>
          <p className="mt-2 text-[14px] leading-relaxed text-muted-foreground">{ex.result}</p>
        </div>
      </div>
    </section>
  );
}
