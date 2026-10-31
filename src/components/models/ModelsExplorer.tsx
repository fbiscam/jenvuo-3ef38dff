import { useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowRight, Braces, Brain, Check, Copy, Eye, Filter, Info, Radio, Search, Wrench,
} from "lucide-react";
import { toast } from "sonner";
import claudeLogo from "@/assets/model-logos/claude-color.svg";
import openAiLogo from "@/assets/model-logos/openai.svg";
import geminiLogo from "@/assets/model-logos/gemini-color.svg";
import deepseekLogo from "@/assets/model-logos/deepseek-color.svg";
import qwenLogo from "@/assets/model-logos/qwen-color.svg";
import kimiLogo from "@/assets/model-logos/kimi-color.svg";
import zhipuLogo from "@/assets/model-logos/zhipu-color.svg";
import bytedanceLogo from "@/assets/model-logos/bytedance-color.svg";
import grokLogo from "@/assets/model-logos/grok.svg";
import metaLogo from "@/assets/model-logos/meta-color.svg";
import {
  MODEL_CATALOG, PRICE_PER_MILLION, PROVIDERS, formatContext, getCatalogModel,
  type Capability, type CatalogModel, type ProviderKey,
} from "@/lib/model-catalog";
import { cn } from "@/lib/utils";

const LOGOS: Record<ProviderKey, string> = {
  anthropic: claudeLogo,
  openai: openAiLogo,
  google: geminiLogo,
  deepseek: deepseekLogo,
  qwen: qwenLogo,
  moonshot: kimiLogo,
  zhipu: zhipuLogo,
  bytedance: bytedanceLogo,
  xai: grokLogo,
  meta: metaLogo,
};

const CAP_META: Record<Capability, { label: string; icon: typeof Brain; cls: string }> = {
  reasoning: { label: "Reasoning", icon: Brain, cls: "bg-gc-yellow-soft text-gc-amber" },
  vision: { label: "Vision", icon: Eye, cls: "bg-gc-blue-soft text-gc-blue-deep" },
  tools: { label: "Tools", icon: Wrench, cls: "bg-gc-blue-soft text-gc-navy" },
  streaming: { label: "Streaming", icon: Radio, cls: "bg-gc-green-soft text-gc-success" },
  json: { label: "JSON", icon: Braces, cls: "bg-gc-green-soft text-gc-green" },
};

function ProviderLogo({ provider, size = "md" }: { provider: ProviderKey; size?: "sm" | "md" | "lg" }) {
  const box = size === "sm" ? "h-7 w-7 rounded-md" : size === "lg" ? "h-12 w-12 rounded-xl" : "h-9 w-9 rounded-lg";
  return (
    <span className={cn("grid shrink-0 place-items-center border border-gc-line bg-background", box)}>
      <img src={LOGOS[provider]} alt={`${PROVIDERS[provider].label} logo`} className="h-[58%] w-[58%] object-contain" loading="lazy" />
    </span>
  );
}

function ModelLogo({ m, size = "md" }: { m: CatalogModel; size?: "sm" | "md" | "lg" }) {
  return <ProviderLogo provider={m.provider} size={size} />;
}

const byIds = (ids: string[]) => ids.map((id) => getCatalogModel(id)).filter(Boolean) as CatalogModel[];

const FLAGSHIPS = byIds(["claude-opus-5.5", "gpt-5.5-pro", "gemini-3.1-pro", "qwen3.8-max", "grok-4.6"]);
const FAST = MODEL_CATALOG.filter((m) => m.tags.includes("fast")).slice(0, 5);
const OPEN = MODEL_CATALOG.filter((m) => m.tags.includes("open")).slice(0, 5);
const CODING = MODEL_CATALOG.filter((m) => m.tags.includes("coding")).slice(0, 5);
const LONG = [...MODEL_CATALOG].sort((a, b) => b.context - a.context).filter((m, i, a) => a.findIndex((x) => x.provider === m.provider) === i).slice(0, 5);
const MAX_CONTEXT = Math.max(...MODEL_CATALOG.map((m) => m.context));
const FAMILY_KEYS: ProviderKey[] = ["anthropic", "openai", "google", "deepseek", "qwen"];

function StatCard({ label, hint, model, value, unit, className }: {
  label: string; hint: string; model: CatalogModel; value: string; unit: string; className?: string;
}) {
  return (
    <div className={cn("flex flex-col justify-between gap-6 border border-gc-line bg-background p-4 sm:p-5", className)}>
      <div>
        <p className="flex items-center gap-1.5 text-sm text-gc-ink-muted" title={hint}>
          {label} <Info className="h-3.5 w-3.5" aria-hidden />
        </p>
        <p className="mt-2 flex items-center gap-2 text-sm font-medium text-gc-ink">
          <ModelLogo m={model} size="sm" /> <span className="truncate">{model.name}</span>
        </p>
      </div>
      <p className="flex items-baseline gap-1.5">
        <span className="text-3xl font-medium tracking-tight tabular-nums text-gc-ink">{value}</span>
        <span className="text-sm text-gc-ink-muted">{unit}</span>
      </p>
    </div>
  );
}

function MiniTable({ title, sub, rows, cols, onPick }: {
  title: string; sub: string; rows: CatalogModel[];
  cols: Array<{ head: string; cell: (m: CatalogModel) => string }>;
  onPick: (id: string) => void;
}) {
  return (
    <section className="min-w-0 border border-gc-line bg-background p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-medium text-gc-ink">{title}</h3>
          <p className="mt-0.5 text-sm text-gc-ink-muted">{sub}</p>
        </div>
      </div>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[420px] text-sm">
          <thead>
            <tr className="border-b border-gc-line text-left text-gc-ink-muted">
              <th className="w-8 py-2 font-normal" />
              <th className="py-2 font-normal">Model</th>
              {cols.map((c) => <th key={c.head} className="whitespace-nowrap py-2 pl-4 text-right font-normal">{c.head}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map((m, i) => (
              <tr key={m.id} onClick={() => onPick(m.id)} className="cursor-pointer border-b border-gc-line last:border-0 hover:bg-gc-section">
                <td className="py-2.5 tabular-nums text-gc-ink-muted">{i + 1}</td>
                <td className="py-2.5">
                  <span className="flex items-center gap-2.5 font-medium text-gc-ink"><ModelLogo m={m} size="sm" /><span className="truncate">{m.name}</span></span>
                </td>
                {cols.map((c) => <td key={c.head} className="whitespace-nowrap py-2.5 pl-4 text-right tabular-nums text-gc-ink">{c.cell(m)}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function SectionHead({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="mb-3">
      <h2 className="text-lg font-medium text-gc-ink">{title}</h2>
      <p className="text-sm text-gc-ink-muted">{sub}</p>
    </div>
  );
}

/** OpenRouter-style catalogue of every model available with a Jenvu API key. */
export default function ModelsExplorer({ apiHref = "/dashboard/api" }: { apiHref?: "/dashboard/api" | "/docs" }) {
  const [selected, setSelected] = useState<string>("claude-opus-5");
  const [query, setQuery] = useState("");
  const [provider, setProvider] = useState<ProviderKey | "all">("all");
  const [cap, setCap] = useState<Capability | "all">("all");
  const [copied, setCopied] = useState(false);
  const catalogRef = useRef<HTMLDivElement | null>(null);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return MODEL_CATALOG.filter((m) =>
      (provider === "all" || m.provider === provider) &&
      (cap === "all" || m.capabilities.includes(cap)) &&
      (!q || m.name.toLowerCase().includes(q) || m.id.includes(q) || PROVIDERS[m.provider].label.toLowerCase().includes(q)),
    );
  }, [query, provider, cap]);

  const current = getCatalogModel(selected) ?? MODEL_CATALOG[0];
  const scrollToCatalog = () => catalogRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  const pick = (id: string) => { setSelected(id); scrollToCatalog(); };

  const copyId = async () => {
    try {
      await navigator.clipboard.writeText(current.id);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Couldn't copy the model ID");
    }
  };

  const price = `$${PRICE_PER_MILLION.toFixed(2)}`;

  return (
    <div className="mx-auto w-full max-w-[1250px] space-y-10 px-4 py-8 sm:px-6 sm:py-10">
      {/* Discover */}
      <header className="border border-gc-line bg-gc-section px-5 py-7 sm:px-8 sm:py-9">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-gc-blue-deep">Jenvu models</p>
            <h1 className="mt-2 text-3xl font-medium tracking-tight text-gc-ink sm:text-4xl">Discover models</h1>
            <p className="mt-2 text-sm text-gc-ink-muted sm:text-base">
              Every model you can call with one Jenvu API key, at one flat price of {price} per million tokens.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <button type="button" onClick={scrollToCatalog} className="rounded-lg bg-gc-blue px-4 py-2 text-sm font-medium text-gc-on-blue transition-colors hover:bg-gc-blue-hover">
                Browse all {MODEL_CATALOG.length} models
              </button>
              <Link to={apiHref} className="rounded-lg border border-gc-line bg-background px-4 py-2 text-sm font-medium text-gc-ink transition-colors hover:border-gc-blue">
                {apiHref === "/dashboard/api" ? "Get an API key" : "API docs"}
              </Link>
            </div>
          </div>
          <dl className="grid grid-cols-3 divide-x divide-gc-line border border-gc-line bg-background">
            {[
              [String(MODEL_CATALOG.length), "Models"],
              [String(new Set(MODEL_CATALOG.map((m) => m.provider)).size), "Labs"],
              [price, "Per 1M tokens"],
            ].map(([v, l]) => (
              <div key={l} className="px-4 py-3 sm:px-6">
                <dt className="text-xs text-gc-ink-muted">{l}</dt>
                <dd className="mt-0.5 text-xl font-medium tabular-nums text-gc-ink">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
      </header>

      <div className="grid gap-3 lg:grid-cols-[1.25fr_1fr]">
        <section className="border border-gc-line bg-background p-4 sm:p-6">
          <p className="text-sm text-gc-ink-muted">Flagship models</p>
          <h2 className="mt-1 text-xl font-medium tracking-tight text-gc-ink sm:text-2xl">The top model from each lab, one key</h2>
          <p className="mt-1.5 text-sm text-gc-ink-muted">Switch between Anthropic, OpenAI, Google, Qwen and xAI by changing a single model ID.</p>
          <div className="mt-5 flex justify-between border-b border-gc-line pb-2 text-sm text-gc-ink-muted">
            <span>Model</span><span>Context window</span>
          </div>
          <ul>
            {FLAGSHIPS.map((m, i) => (
              <li key={m.id}>
                <button type="button" onClick={() => pick(m.id)} className="flex w-full items-center gap-3 border-b border-gc-line py-3 text-left last:border-0 hover:bg-gc-section">
                  <span className="w-5 text-center text-sm text-gc-ink-muted">{i + 1}</span>
                  <ModelLogo m={m} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-gc-ink">{m.name}</span>
                    <span className="block text-sm text-gc-ink-muted">{PROVIDERS[m.provider].label}</span>
                  </span>
                  <span className="hidden h-1.5 w-24 overflow-hidden rounded-full bg-gc-panel sm:block">
                    <span className="block h-full rounded-full bg-gc-blue" style={{ width: `${(m.context / MAX_CONTEXT) * 100}%` }} />
                  </span>
                  <span className="w-14 text-right text-sm font-medium tabular-nums text-gc-ink">{formatContext(m.context)}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <StatCard label="Default on Jenvu" hint="Used when a request names no model" model={getCatalogModel("claude-opus-5")!} value={price} unit="/M tokens" />
          <StatCard label="Smartest open model" hint="Open-weight model with the most capability" model={getCatalogModel("glm-5.3")!} value="Open" unit="weights" />
          <StatCard label="Fastest replies" hint="Light model for quick answers" model={getCatalogModel("gemini-3.7-flash")!} value={formatContext(getCatalogModel("gemini-3.7-flash")!.context)} unit="context" />
          <StatCard label="Most models" hint="Provider with the most models on Jenvu" model={getCatalogModel("claude-opus-5")!} value={String(MODEL_CATALOG.filter((m) => m.provider === "anthropic").length)} unit="Claude models" />
          <StatCard className="sm:col-span-2" label="Smartest coding" hint="Claude tuned for code" model={getCatalogModel("claude-fable-5.1")!} value={formatContext(getCatalogModel("claude-fable-5.1")!.context)} unit="token context" />
        </div>
      </div>

      {/* Families */}
      <section>
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-lg font-medium text-gc-ink">Model families</h2>
          <button type="button" onClick={() => { setProvider("all"); scrollToCatalog(); }} className="text-sm text-gc-ink underline underline-offset-4 hover:text-gc-blue">View all</button>
        </div>
        <div className="flex snap-x gap-3 overflow-x-auto pb-1 lg:grid lg:grid-cols-5 lg:overflow-visible">
          {FAMILY_KEYS.map((key) => {
            const count = MODEL_CATALOG.filter((m) => m.provider === key).length;
            const sample = MODEL_CATALOG.find((m) => m.provider === key)!;
            return (
              <button key={key} type="button" onClick={() => { setProvider(key); setSelected(sample.id); scrollToCatalog(); }}
                className="flex w-64 shrink-0 snap-start flex-col items-start justify-start border border-gc-line bg-background p-4 text-left transition-colors hover:border-gc-blue hover:bg-gc-section lg:w-auto">
                <span className="flex w-full items-center gap-2.5 text-base font-medium text-gc-ink"><ProviderLogo provider={key} size="sm" /><span className="truncate">{PROVIDERS[key].label}</span><span className="ml-auto rounded-full bg-background px-2 py-0.5 text-xs font-normal tabular-nums text-gc-ink-muted">{count} models</span></span>
                <span className="mt-3 line-clamp-3 block text-sm text-gc-ink-muted">{PROVIDERS[key].blurb}</span>
              </button>
            );
          })}
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <MiniTable title="Fastest models" sub="Light models for quick, low-latency replies." rows={FAST} onPick={pick}
          cols={[{ head: "Context", cell: (m) => formatContext(m.context) }, { head: "Price", cell: () => `${price}/M` }]} />
        <MiniTable title="Open-weight models" sub="Open models available through the same key." rows={OPEN} onPick={pick}
          cols={[{ head: "Provider", cell: (m) => PROVIDERS[m.provider].label }, { head: "Context", cell: (m) => formatContext(m.context) }]} />
        <MiniTable title="Best for coding" sub="Models tuned for writing and reviewing code." rows={CODING} onPick={pick}
          cols={[{ head: "Tools", cell: (m) => (m.capabilities.includes("tools") ? "Yes" : "–") }, { head: "Context", cell: (m) => formatContext(m.context) }]} />
        <MiniTable title="Long context" sub="The largest window from each provider." rows={LONG} onPick={pick}
          cols={[{ head: "Provider", cell: (m) => PROVIDERS[m.provider].label }, { head: "Context", cell: (m) => formatContext(m.context) }]} />
      </div>

      {/* Capabilities */}
      <section>
        <SectionHead title="Explore every capability" sub="Start with a focused set of models for the job you need to do." />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {([
            ["reasoning", "Reasoning", "Multi-step thinking for analysis, maths and planning."],
            ["vision", "Image understanding", "Read screenshots, charts, documents and photos."],
            ["tools", "Tool calling", "Let the model call your functions and APIs."],
            ["json", "Structured output", "Get clean JSON your app can parse directly."],
          ] as const).map(([key, title, text]) => {
            const Icon = CAP_META[key].icon;
            return (
              <button key={key} type="button" onClick={() => { setCap(key); setProvider("all"); scrollToCatalog(); }}
                className="flex flex-col items-start justify-start border border-gc-line bg-background p-4 text-left transition-colors hover:border-gc-blue hover:bg-gc-section sm:p-5">
                <span className={cn("grid h-9 w-9 place-items-center rounded-lg", CAP_META[key].cls)}><Icon className="h-4 w-4" /></span>
                <span className="mt-6 block text-sm font-medium text-gc-ink">{title}</span>
                <span className="mt-1 block text-sm text-gc-ink-muted">{text}</span>
                <span className="mt-auto flex items-center gap-1 pt-4 text-sm font-medium text-gc-ink">
                  See {MODEL_CATALOG.filter((m) => m.capabilities.includes(key)).length} models <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Catalogue browser */}
      <section ref={catalogRef} className="scroll-mt-24">
        <SectionHead title="All models" sub="Search, filter and open any model to see its price, specs and capabilities." />
        <div className="grid overflow-hidden border border-gc-line bg-background md:grid-cols-[300px_1fr]">
          <div className="flex min-h-0 flex-col border-b border-gc-line bg-background md:border-b-0 md:border-r">
            <div className="flex items-center gap-2 p-3">
              <label className="flex flex-1 items-center gap-2 rounded-lg border border-gc-line bg-background px-3 py-2">
                <Search className="h-4 w-4 text-gc-ink-muted" aria-hidden />
                <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search models..." aria-label="Search models"
                  className="w-full bg-transparent text-sm text-gc-ink outline-none placeholder:text-gc-ink-muted" />
              </label>
              <label className="relative grid h-9 w-9 place-items-center rounded-lg border border-gc-line bg-background" title="Filter by provider">
                <Filter className="h-4 w-4 text-gc-ink-muted" aria-hidden />
                <select value={provider} onChange={(e) => setProvider(e.target.value as ProviderKey | "all")} aria-label="Filter by provider"
                  className="absolute inset-0 cursor-pointer opacity-0">
                  <option value="all">All providers</option>
                  {(Object.keys(PROVIDERS) as ProviderKey[]).map((k) => <option key={k} value={k}>{PROVIDERS[k].label}</option>)}
                </select>
              </label>
            </div>
            {(provider !== "all" || cap !== "all") && (
              <div className="flex flex-wrap items-center gap-1.5 px-3 pb-2 text-xs">
                {provider !== "all" && <span className="rounded-full bg-gc-blue-soft px-2 py-0.5 text-gc-blue-deep">{PROVIDERS[provider].label}</span>}
                {cap !== "all" && <span className="rounded-full bg-gc-blue-soft px-2 py-0.5 text-gc-blue-deep">{CAP_META[cap].label}</span>}
                <button type="button" onClick={() => { setProvider("all"); setCap("all"); }} className="text-gc-ink-muted underline">Clear</button>
              </div>
            )}
            <ul className="max-h-[420px] overflow-y-auto px-2 pb-2 md:max-h-[520px]">
              {list.length === 0 && <li className="px-3 py-6 text-center text-sm text-gc-ink-muted">No models match.</li>}
              {list.map((m) => (
                <li key={m.id}>
                  <button type="button" onClick={() => setSelected(m.id)}
                    className={cn("flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left", m.id === current.id ? "bg-gc-console-rail-active" : "hover:bg-gc-section")}>
                    <ModelLogo m={m} size="sm" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-gc-ink">{m.name}</span>
                      <span className="block truncate font-mono text-xs text-gc-ink-muted">{m.id}</span>
                    </span>
                    {m.id === "claude-opus-5" && <span className="h-1.5 w-1.5 rounded-full bg-gc-blue" aria-label="Default" />}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex flex-col p-4 sm:p-6">
            <div className="flex items-center gap-3">
              <ModelLogo m={current} size="lg" />
              <div className="min-w-0">
                <h3 className="truncate text-lg font-semibold text-gc-ink">{current.name}</h3>
                <p className="font-mono text-sm text-gc-ink-muted">{current.id}</p>
              </div>
            </div>
            <p className="mt-3 text-sm text-gc-ink">{current.description}</p>

            <p className="mt-5 text-xs font-medium uppercase tracking-wider text-gc-ink-muted">Pricing</p>
            <dl className="mt-2 divide-y divide-gc-line rounded-lg border border-gc-line bg-gc-section text-sm">
              <div className="flex justify-between px-3 py-2"><dt className="text-gc-ink-muted">Input</dt><dd className="font-semibold tabular-nums text-gc-ink">{price} / 1M</dd></div>
              <div className="flex justify-between px-3 py-2"><dt className="text-gc-ink-muted">Output</dt><dd className="font-semibold tabular-nums text-gc-ink">{price} / 1M</dd></div>
              <div className="flex justify-between px-3 py-2"><dt className="text-gc-ink-muted">Per request</dt><dd className="font-semibold text-gc-success">Free</dd></div>
            </dl>

            <p className="mt-5 text-xs font-medium uppercase tracking-wider text-gc-ink-muted">Specs</p>
            <dl className="mt-2 divide-y divide-gc-line rounded-lg border border-gc-line bg-gc-section text-sm">
              <div className="flex items-center justify-between gap-3 px-3 py-2">
                <dt className="text-gc-ink-muted">Model ID</dt>
                <dd>
                  <button type="button" onClick={copyId} className="flex items-center gap-1.5 font-mono font-semibold text-gc-blue-deep" aria-label="Copy model ID">
                    {current.id} {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                </dd>
              </div>
              <div className="flex justify-between px-3 py-2"><dt className="text-gc-ink-muted">Provider</dt><dd className="font-semibold text-gc-ink">{PROVIDERS[current.provider].label}</dd></div>
              <div className="flex justify-between px-3 py-2"><dt className="text-gc-ink-muted">Context</dt><dd className="font-semibold text-gc-ink">{formatContext(current.context)} tokens</dd></div>
            </dl>

            <p className="mt-5 text-xs font-medium uppercase tracking-wider text-gc-ink-muted">Capabilities</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {current.capabilities.map((c) => {
                const Icon = CAP_META[c].icon;
                return (
                  <span key={c} className={cn("inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium", CAP_META[c].cls)}>
                    <Icon className="h-3.5 w-3.5" /> {CAP_META[c].label}
                  </span>
                );
              })}
            </div>

            <div className="mt-6 border-t border-gc-line pt-4 md:mt-auto">
              <Link to={apiHref} className="flex w-full items-center justify-center gap-2 rounded-lg bg-gc-blue px-4 py-2.5 text-sm font-medium text-gc-on-blue hover:bg-gc-blue-hover">
                {apiHref === "/dashboard/api" ? "Use with an API key" : "Read the API docs"} <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
