import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Copy, Check, File } from "lucide-react";
import { SiCurl, SiLangchain } from "react-icons/si";
import { ProviderLogo } from "@/components/models/ModelsExplorer";
import { useAuthUser } from "@/hooks/useAuthUser";
import { useCredits } from "@/hooks/useCredits";
import { highlight } from "@/components/dashboard/CodeHighlight";
import { PRICE_PER_MILLION } from "@/lib/model-catalog";
import starsNebula from "@/assets/platform/stars-nebula.webp";
import starsPlain from "@/assets/platform/stars-plain.webp";
import { PlatformLogo } from "@/components/brand/ProductLogos";

const BASE = "https://jenvu.com/api/public/v1";

/** Top (heaviest) model from each lab, shown as starfield cards like the Platform page. */
const TOP_MODELS = [
  { id: "claude-opus-5.5", name: "Claude Opus 5.5", a: "Deep reasoning and long documents", b: "Code review and refactoring", img: starsNebula },
  { id: "gpt-5.5-pro", name: "GPT-5.5 Pro", a: "Extra thinking for hard problems", b: "Trading scripts and coding help", img: starsPlain },
  { id: "gemini-3.1-pro", name: "Gemini 3.1 Pro", a: "Text and image understanding", b: "Charts and screenshots", img: starsPlain },
  { id: "deepseek-v4-pro-max", name: "DeepSeek V4 Pro Max", a: "Strongest DeepSeek for maths", b: "Code and high-volume workloads", img: starsPlain },
] as const;

const PyLogo = () => (<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#3776AB" d="M11.9 1C6.3 1 6.6 3.4 6.6 3.4v2.5h5.4v.8H4.5S1 6.3 1 12s3.1 5.5 3.1 5.5h1.8v-2.6s-.1-3.1 3-3.1h5.3s2.9 0 2.9-2.8V4.3S17.6 1 11.9 1zM8.9 2.7a1 1 0 110 1.9 1 1 0 010-1.9z"/><path fill="#FFD43B" d="M12.1 23c5.6 0 5.3-2.4 5.3-2.4v-2.5H12v-.8h7.5s3.5.4 3.5-5.3-3.1-5.5-3.1-5.5h-1.8v2.6s.1 3.1-3 3.1H9.8s-2.9 0-2.9 2.8v4.7S6.4 23 12.1 23zm3-1.7a1 1 0 110-1.9 1 1 0 010 1.9z"/></svg>);
const NodeLogo = () => (<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#5FA04E" d="M12 1.5l9.1 5.25v10.5L12 22.5l-9.1-5.25V6.75z"/></svg>);
const OpenAILogo = () => <ProviderLogo provider="openai" bare />;
const CurlLogo = () => <SiCurl color="#073551" />;
const LangLogo = () => <SiLangchain color="#1C3C3C" />;

const MINI = {
  "OpenAI SDK": { icon: OpenAILogo, file: "client.py", code: `from openai import OpenAI
api = OpenAI(base_url="${BASE}")
r = api.chat.completions.create(model="gpt-5.5",
  messages=[{"role": "user", "content": "Hello!"}])
print(r.choices[0].message.content)` },
  Python: { icon: PyLogo, file: "request.py", code: `import os, requests
r = requests.post("${BASE}/chat/completions",
  headers={"Authorization": f"Bearer {os.environ['JENVU_API_KEY']}"},
  json={"model": "gpt-5.5", "messages": [{"role": "user", "content": "Hello!"}]})
print(r.json()["choices"][0]["message"]["content"])` },
  "Node.js": { icon: NodeLogo, file: "index.mjs", code: `import OpenAI from "openai";
const api = new OpenAI({ baseURL: "${BASE}", apiKey: process.env.JENVU_API_KEY });
const r = await api.chat.completions.create({ model: "gpt-5.5",
  messages: [{ role: "user", content: "Hello!" }] });
console.log(r.choices[0].message.content);` },
  cURL: { icon: CurlLogo, file: "request.sh", code: `curl ${BASE}/chat/completions \\
  -H "Authorization: Bearer $JENVU_API_KEY" \\
  -d '{"model": "gpt-5.5", "messages":
    [{"role": "user", "content": "Hello!"}]}'` },
  LangChain: { icon: LangLogo, file: "chain.py", code: `from langchain_openai import ChatOpenAI
llm = ChatOpenAI(model="gpt-5.5", base_url="${BASE}")
print(llm.invoke("Hello!").content)` },
} as const;
type MiniTab = keyof typeof MINI;

function QuickstartCard({ hasKeys }: { hasKeys: boolean }) {
  const [tab, setTab] = useState<MiniTab>("OpenAI SDK");
  const [copied, setCopied] = useState(false);
  const ex = MINI[tab];
  const copy = () => {
    void navigator.clipboard?.writeText(ex.code).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); });
  };
  return (
    <div className="console-card flex min-h-[184px] min-w-0 flex-col p-3">
      <div className="flex flex-wrap items-center gap-1" role="tablist" aria-label="Code examples">
        {(Object.keys(MINI) as MiniTab[]).map((t) => { const Icon = MINI[t].icon; return (
          <button key={t} type="button" role="tab" aria-selected={t === tab} onClick={() => { setTab(t); setCopied(false); }}
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] transition [&_svg]:h-3.5 [&_svg]:w-3.5 ${t === tab ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
            <Icon />{t}
          </button>); })}
      </div>
      <div className="code-api-workspace mt-2 grid min-w-0 flex-1 grid-cols-1 gap-1.5 p-1.5 sm:grid-cols-[1.4fr_1fr]">
        <div className="code-api-setup min-w-0 p-2.5">
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span className="flex min-w-0 items-center gap-1.5"><File className="h-3 w-3 shrink-0" /><span className="truncate font-code">{ex.file}</span></span>
            <button type="button" onClick={copy} aria-label="Copy code" className="rounded-full p-1 hover:text-foreground">{copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}</button>
          </div>
          <pre className="mt-1.5 whitespace-pre-wrap break-words font-code text-[11px] leading-[1.6] [overflow-wrap:anywhere]"><code>{highlight(ex.code)}</code></pre>
        </div>
        <div className="min-w-0 p-2.5 text-[12px]">
          <p className="text-[11px] text-muted-foreground">Result · Example</p>
          <p className="mt-2 leading-relaxed text-muted-foreground">Hello! How can I help you today?</p>
        </div>
      </div>
      <div className="mt-2 px-1 text-[12px] text-muted-foreground">
        {hasKeys ? "Use one of your active keys as JENVU_API_KEY." : <Link to="/dashboard/api" className="font-medium text-foreground underline-offset-4 hover:underline">Generate API key →</Link>}
        {" · "}<Link to="/dashboard/code" className="underline-offset-4 hover:underline">More examples</Link>
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
