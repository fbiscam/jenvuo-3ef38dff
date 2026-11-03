// Display details for every model offered through the Jenvu API.
// The ids come from PUBLIC_API_MODEL_IDS; price is Jenvu's flat token rate.
import { PUBLIC_API_MODEL_IDS, type PublicApiModelId } from "@/lib/public-api-models";

export type Capability = "reasoning" | "vision" | "tools" | "streaming" | "json";
export type ProviderKey =
  | "anthropic" | "openai" | "google" | "deepseek" | "qwen" | "moonshot"
  | "zhipu" | "bytedance" | "xai" | "meta" | "mistral" | "minimax" | "nvidia";

export type CatalogModel = {
  id: PublicApiModelId;
  name: string;
  provider: ProviderKey;
  description: string;
  /** Context window in tokens. */
  context: number;
  capabilities: Capability[];
  tags: Array<"fast" | "open" | "coding" | "flagship">;
};

export const PROVIDERS: Record<ProviderKey, { label: string; blurb: string }> = {
  anthropic: { label: "Anthropic", blurb: "Claude models for deep reasoning, long documents." },
  openai: { label: "OpenAI", blurb: "GPT models for general chat, tools and structured answers." },
  google: { label: "Google", blurb: "Gemini and Gemma models with long context and fast." },
  deepseek: { label: "DeepSeek", blurb: "Open-weight models with strong maths, code and value." },
  qwen: { label: "Qwen", blurb: "Alibaba's Qwen family, from compact 27B to Max." },
  moonshot: { label: "Moonshot", blurb: "Kimi models built for agents and long tasks." },
  zhipu: { label: "Zhipu", blurb: "GLM open models for coding and multilingual work." },
  bytedance: { label: "ByteDance", blurb: "Seed models tuned for speed and everyday tasks." },
  xai: { label: "xAI", blurb: "Grok models with live-style, direct answers." },
  meta: { label: "Meta", blurb: "Muse models for creative and general chat." },
  mistral: { label: "Mistral", blurb: "European models from tiny Ministral to Mistral Large and Devstral for code." },
  minimax: { label: "MiniMax", blurb: "MiniMax M2 models for agents, coding and long tasks." },
  nvidia: { label: "NVIDIA", blurb: "Nemotron models tuned for fast, efficient reasoning." },
};

/** Flat Jenvu price, USD per 1M tokens (prompt and reply). */
export const PRICE_PER_MILLION = 3;

const ALL: Capability[] = ["reasoning", "vision", "tools", "streaming", "json"];
const TEXT: Capability[] = ["reasoning", "tools", "streaming", "json"];

const M = (
  id: PublicApiModelId, name: string, provider: ProviderKey, context: number,
  description: string, capabilities: Capability[], tags: CatalogModel["tags"] = [],
): CatalogModel => ({ id, name, provider, context, description, capabilities, tags });

const K = 1_000;
const MIL = 1_000_000;

export const MODEL_CATALOG: CatalogModel[] = [
  M("deepseek-v3.2", "DeepSeek V3.2", "deepseek", 128 * K, "DeepSeek's latest V3 model: strong reasoning, maths and code. Default for API calls that name no model.", TEXT, ["flagship", "open"]),
  M("deepseek-v3.1", "DeepSeek V3.1", "deepseek", 128 * K, "Previous DeepSeek V3 release, fast and reliable.", TEXT, ["open"]),
  M("qwen3-coder-480b", "Qwen3 Coder 480B", "qwen", 256 * K, "Qwen's largest coding model for big projects, refactors and agents.", TEXT, ["coding", "open", "flagship"]),
  M("qwen3-coder-30b", "Qwen3 Coder 30B", "qwen", 256 * K, "Compact Qwen coding model, quick to answer.", TEXT, ["coding", "open", "fast"]),
  M("qwen3-coder-next", "Qwen3 Coder Next", "qwen", 256 * K, "Newest Qwen coding release.", TEXT, ["coding", "open"]),
  M("qwen3-235b", "Qwen3 235B", "qwen", 256 * K, "Large Qwen3 model for general reasoning and writing.", TEXT, ["open"]),
  M("qwen3-vl-235b", "Qwen3 VL 235B", "qwen", 256 * K, "Qwen3 vision model: reads images, charts and screenshots.", ALL, ["open"]),
  M("qwen3-next-80b", "Qwen3 Next 80B", "qwen", 256 * K, "Efficient Qwen3 Next model with fast replies.", TEXT, ["open", "fast"]),
  M("qwen3-32b", "Qwen3 32B", "qwen", 128 * K, "Small Qwen3 model for everyday tasks.", TEXT, ["open", "fast"]),
  M("mistral-large-3", "Mistral Large 3", "mistral", 256 * K, "Mistral's flagship model for hard reasoning and long documents.", ALL, ["flagship", "open"]),
  M("devstral-2", "Devstral 2", "mistral", 256 * K, "Mistral's coding model for agents and large codebases.", TEXT, ["coding", "open"]),
  M("magistral-small", "Magistral Small", "mistral", 128 * K, "Small Mistral reasoning model that thinks step by step.", TEXT, ["open"]),
  M("ministral-3-14b", "Ministral 3 14B", "mistral", 128 * K, "Compact Mistral model, quick and inexpensive.", TEXT, ["open", "fast"]),
  M("ministral-3-8b", "Ministral 3 8B", "mistral", 128 * K, "Smaller Ministral for very fast replies.", TEXT, ["open", "fast"]),
  M("ministral-3-3b", "Ministral 3 3B", "mistral", 128 * K, "Tiny Ministral for simple tasks.", TEXT, ["open", "fast"]),
  M("kimi-k2.5", "Kimi K2.5", "moonshot", 256 * K, "Moonshot's Kimi K2.5 for agents, tools and long tasks.", TEXT, ["open"]),
  M("kimi-k2-thinking", "Kimi K2 Thinking", "moonshot", 256 * K, "Kimi that reasons step by step before answering.", TEXT, ["open"]),
  M("gpt-oss-120b", "GPT-OSS 120B", "openai", 128 * K, "OpenAI's open-weight 120B model with built-in reasoning.", TEXT, ["open"]),
  M("gpt-oss-20b", "GPT-OSS 20B", "openai", 128 * K, "Smaller open-weight OpenAI model, quick to answer.", TEXT, ["open", "fast"]),
  M("glm-5", "GLM-5", "zhipu", 200 * K, "Zhipu GLM-5, strong at code and many languages.", TEXT, ["open", "coding"]),
  M("glm-4.7", "GLM-4.7", "zhipu", 200 * K, "GLM-4.7 for coding and agent work.", TEXT, ["open", "coding"]),
  M("glm-4.7-flash", "GLM-4.7 Flash", "zhipu", 200 * K, "Fast GLM-4.7 for quick replies.", TEXT, ["open", "fast"]),
  M("glm-4.6", "GLM-4.6", "zhipu", 200 * K, "Previous GLM release.", TEXT, ["open"]),
  M("minimax-m2.5", "MiniMax M2.5", "minimax", 200 * K, "MiniMax's newest model for coding and agents.", TEXT, ["open", "coding"]),
  M("minimax-m2.1", "MiniMax M2.1", "minimax", 200 * K, "MiniMax M2.1 for long multi-step tasks.", TEXT, ["open"]),
  M("minimax-m2", "MiniMax M2", "minimax", 200 * K, "First MiniMax M2 release.", TEXT, ["open"]),
  M("gemma-3-27b", "Gemma 3 27B", "google", 128 * K, "Google's open Gemma 3, the largest size.", TEXT, ["open"]),
  M("gemma-3-12b", "Gemma 3 12B", "google", 128 * K, "Mid-size open Gemma 3.", TEXT, ["open", "fast"]),
  M("gemma-3-4b", "Gemma 3 4B", "google", 128 * K, "Small open Gemma 3 for quick tasks.", TEXT, ["open", "fast"]),
  M("nemotron-super-3", "Nemotron Super 3", "nvidia", 128 * K, "NVIDIA's 120B Nemotron for reasoning and agents.", TEXT, ["open"]),
  M("nemotron-nano-3", "Nemotron Nano 3", "nvidia", 128 * K, "Efficient 30B Nemotron, quick and capable.", TEXT, ["open", "fast"]),
  M("nemotron-nano-9b", "Nemotron Nano 9B", "nvidia", 128 * K, "Tiny Nemotron for very fast replies.", TEXT, ["open", "fast"]),
  M("claude-opus-5", "Claude Opus 5", "anthropic", MIL, "Anthropic's most capable model. Exceptional reasoning and agentic performance.", ALL, ["flagship"]),
  M("claude-opus-5.5", "Claude Opus 5.5", "anthropic", MIL, "Anthropic's best model and the Chat default, built for the hardest reasoning and analysis.", ALL, ["flagship"]),
  M("claude-fable-5.1", "Claude Fable 5.1", "anthropic", MIL, "Claude tuned for code: refactors, reviews and long agent runs.", ALL, ["coding"]),
  M("claude-fable-5", "Claude Fable 5", "anthropic", MIL, "The first Fable release, a reliable coding and writing model.", ALL, ["coding"]),
  M("claude-sonnet-5", "Claude Sonnet 5", "anthropic", MIL, "Balanced Claude model: strong quality at a quicker pace.", ALL, ["coding"]),
  M("claude-mythos-preview", "Claude Mythos Preview", "anthropic", MIL, "Preview of Anthropic's next model family. Behaviour may change.", ALL),
  M("claude-opus-4.8", "Claude Opus 4.8", "anthropic", MIL, "Mature Opus 4 release with steady, careful answers.", ALL),
  M("claude-opus-4.7", "Claude Opus 4.7", "anthropic", MIL, "Opus 4 release for long documents and analysis.", ALL),
  M("claude-opus-4.6", "Claude Opus 4.6", "anthropic", MIL, "Earlier Opus 4 release kept for existing integrations.", ALL),
  M("gpt-5.5", "GPT-5.5", "openai", 400 * K, "OpenAI's all-round model for chat, tools and structured output.", ALL),
  M("gpt-5.5-pro", "GPT-5.5 Pro", "openai", 400 * K, "GPT-5.5 with extra thinking time for difficult problems.", ALL, ["flagship"]),
  M("gpt-5.6-sol", "GPT-5.6 Sol", "openai", 400 * K, "GPT-5.6 tier focused on depth and accuracy.", ALL),
  M("gpt-5.6-terra", "GPT-5.6 Terra", "openai", 400 * K, "GPT-5.6 tier for everyday work and coding.", ALL, ["coding"]),
  M("gpt-5.6-luna", "GPT-5.6 Luna", "openai", 400 * K, "Light GPT-5.6 tier for quick, low-latency replies.", ALL, ["fast"]),
  M("gemini-3.1-pro", "Gemini 3.1 Pro", "google", MIL, "Google's pro model for reasoning over very long inputs.", ALL, ["flagship"]),
  M("gemini-3.7-flash", "Gemini 3.7 Flash", "google", MIL, "Fast Gemini with a 1M-token context window.", ALL, ["fast"]),
  M("gemini-3.6-flash", "Gemini 3.6 Flash", "google", MIL, "Previous Flash release, quick and inexpensive to run.", ALL, ["fast"]),
  M("gemma-2-2b", "Gemma 2 2B", "google", 8 * K, "Tiny open model for simple, very fast tasks.", ["streaming"], ["fast", "open"]),
  M("deepseek-v4-pro-max", "DeepSeek V4 Pro Max", "deepseek", 128 * K, "DeepSeek's strongest V4 model for maths and code.", TEXT, ["open", "coding"]),
  M("deepseek-v4-pro-0813", "DeepSeek V4 Pro 0813", "deepseek", 128 * K, "V4 Pro snapshot from August, strong reasoning.", TEXT, ["open"]),
  M("deepseek-v4-flash-0731", "DeepSeek V4 Flash 0731", "deepseek", 128 * K, "Fast V4 snapshot with great value per token.", TEXT, ["open", "fast"]),
  M("qwen3.8-max", "Qwen3.8 Max", "qwen", 256 * K, "Qwen's largest model, built for hard reasoning.", ALL, ["flagship"]),
  M("qwen3.7-max", "Qwen3.7 Max", "qwen", 256 * K, "Previous Qwen Max release.", ALL),
  M("qwen3.8-27b", "Qwen3.8 27B", "qwen", 256 * K, "Compact open Qwen model, quick to answer.", TEXT, ["open", "fast"]),
  M("kimi-k3", "Kimi K3", "moonshot", 256 * K, "Moonshot's newest Kimi for agents and long tasks.", ALL, ["open"]),
  M("kimi-k2.6", "Kimi K2.6", "moonshot", 256 * K, "Kimi K2 release with strong tool use.", TEXT, ["open"]),
  M("glm-5.3", "GLM-5.3", "zhipu", 200 * K, "Zhipu's latest open GLM, good at code and many languages.", TEXT, ["open", "coding"]),
  M("glm-5.2", "GLM-5.2", "zhipu", 200 * K, "Previous GLM release.", TEXT, ["open"]),
  M("seed-2.1-pro", "Seed 2.1 Pro", "bytedance", 256 * K, "ByteDance Seed for higher quality answers.", ALL),
  M("seed-2.1-turbo", "Seed 2.1 Turbo", "bytedance", 256 * K, "Seed tuned for speed.", ALL, ["fast"]),
  M("grok-4.6", "Grok 4.6", "xai", 256 * K, "xAI's latest Grok with direct, confident answers.", ALL, ["flagship"]),
  M("grok-4.5", "Grok 4.5", "xai", 256 * K, "Previous Grok release.", ALL),
  M("muse-spark-1.1", "Muse Spark 1.1", "meta", 256 * K, "Meta's Muse model for creative and general chat.", TEXT),
];

export function getCatalogModel(id: string): CatalogModel | undefined {
  return MODEL_CATALOG.find((m) => m.id === id);
}

/**
 * Reorders models so companies are mixed: never two of the same provider in a
 * row while another provider still has models left. Keeps each provider's own order.
 */
export function mixByProvider(models: CatalogModel[]): CatalogModel[] {
  const queues = new Map<ProviderKey, CatalogModel[]>();
  for (const m of models) {
    if (!queues.has(m.provider)) queues.set(m.provider, []);
    queues.get(m.provider)!.push(m);
  }
  const order = [...queues.keys()];
  const out: CatalogModel[] = [];
  let last: ProviderKey | null = null;
  let turn = 0;
  while (out.length < models.length) {
    const remaining = models.length - out.length;
    // A company that would otherwise run out of gaps must go now.
    let pick: ProviderKey | null = order.find((p) => p !== last && queues.get(p)!.length * 2 > remaining) ?? null;
    if (!pick) {
      // Otherwise take companies in turn, one model each.
      for (let i = 0; i < order.length; i++) {
        const p = order[(turn + i) % order.length];
        if (queues.get(p)!.length && p !== last) { pick = p; turn = (turn + i + 1) % order.length; break; }
      }
    }
    if (!pick) pick = last!; // only one company left
    out.push(queues.get(pick)!.shift()!);
    last = pick;
  }
  return out;
}

/** Every model, companies mixed, for lists on the Models page. */
export const MIXED_CATALOG = mixByProvider(MODEL_CATALOG);

export function formatContext(tokens: number): string {
  if (tokens >= MIL) return `${tokens / MIL}M`;
  return `${Math.round(tokens / K)}K`;
}

/** Ids with no catalog entry (should always be empty). */
export function missingCatalogIds(): string[] {
  return PUBLIC_API_MODEL_IDS.filter((id) => !getCatalogModel(id));
}
