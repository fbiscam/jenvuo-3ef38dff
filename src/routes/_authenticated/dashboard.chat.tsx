import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowUp,
  Braces,
  Check,
  ChevronDown,
  Code2,
  Copy,
  FileText,
  ImageIcon,
  Languages,
  Lightbulb,
  LineChart,
  Loader2,
  Mail,
  Newspaper,
  Paperclip,
  Plus,
  RotateCcw,
  SlidersHorizontal,
  Wallet,
  X,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MessageResponse } from "@/components/ai-elements/message";
import { highlight } from "@/components/dashboard/CodeHighlight";
import { MIXED_CATALOG, PROVIDERS, PRICE_PER_MILLION, formatContext, getCatalogModel } from "@/lib/model-catalog";
import { playgroundChat } from "@/lib/playground.functions";
import { PLAYGROUND_DEFAULT_MODEL, PLAYGROUND_MAX_IMAGES, PLAYGROUND_MAX_TOKENS, type PlaygroundTurn } from "@/lib/playground";
import { DOC_ACCEPT, IMAGE_ACCEPT, composeMessage, readAttachment, type ChatAttachment } from "@/components/dashboard/chat-attachments";

export const Route = createFileRoute("/_authenticated/dashboard/chat")({
  head: () => ({
    meta: [
      { title: "Chat API · Jenvu Console" },
      { name: "description", content: "Try every Jenvu API model in a chat before you build with it." },
      { property: "og:title", content: "Chat API · Jenvu Console" },
      { property: "og:description", content: "Try every Jenvu API model in a chat before you build with it." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ChatPlayground,
});

type Turn = PlaygroundTurn & {
  id: string;
  /** What the user typed (content also carries attached document text). */
  display?: string;
  files?: { name: string; kind: "image" | "doc"; url?: string }[];
  model?: string;
  tokens?: number;
  cost?: number;
  ms?: number;
  error?: boolean;
};

const API_BASE = "https://jenvu.com/api/public/v1";

type Example = {
  icon: LucideIcon;
  tone: string;
  title: string;
  text: string;
  tags: string[];
  prompt: string;
  instructions?: string;
};

// Colored icon chips, one tone per card (light and dark variants).
const EXAMPLES: Example[] = [
  {
    icon: Lightbulb,
    tone: "bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400",
    title: "Brainstorm product names",
    text: "Generate punchy, memorable names for a new product.",
    tags: ["System prompt"],
    instructions: "You are a naming expert. Give short, punchy names with a one-line reason each.",
    prompt: "Suggest 8 names for a trading journal app for Gold traders.",
  },
  {
    icon: Newspaper,
    tone: "bg-violet-100 text-violet-600 dark:bg-violet-500/15 dark:text-violet-400",
    title: "Summarize an article",
    text: "Condense long-form text into a tight, faithful summary.",
    tags: ["System prompt", "Documents"],
    instructions: "Summarize faithfully in 3 to 5 bullet points. Do not add facts that aren't in the text.",
    prompt: "Summarize this: Gold often reacts to US dollar strength, interest-rate expectations and risk sentiment, so traders watch economic news, yields and session opens before planning entries.",
  },
  {
    icon: Braces,
    tone: "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400",
    title: "Extract structured data",
    text: "Pull fields from unstructured text into JSON.",
    tags: ["Structured outputs"],
    instructions: "Reply with valid JSON only, no extra text.",
    prompt: 'Extract {"name","email","company","budget_usd"} from: "Hi, I\'m Sara Khan from Northwind, sara@northwind.io — our budget is about $4,500."',
  },
  {
    icon: Code2,
    tone: "bg-pink-100 text-pink-600 dark:bg-pink-500/15 dark:text-pink-400",
    title: "Review a code snippet",
    text: "Get a focused review with concrete, actionable fixes.",
    tags: ["System prompt", "Reasoning"],
    instructions: "You are a senior engineer. List bugs first, then improvements, each with a short fix.",
    prompt: "Review this Python:\n\ndef sma(prices, n):\n    return sum(prices[-n:]) / n",
  },
  {
    icon: ImageIcon,
    tone: "bg-sky-100 text-sky-600 dark:bg-sky-500/15 dark:text-sky-400",
    title: "Describe an image",
    text: "Attach a screenshot or photo and ask about it.",
    tags: ["Image input"],
    prompt: "Describe what you see in the attached image in 3 short points.",
  },
  {
    icon: LineChart,
    tone: "bg-zinc-200 text-zinc-800 dark:bg-zinc-500/20 dark:text-zinc-200",
    title: "Explain a market idea",
    text: "Plain-words explanation of a trading concept.",
    tags: ["System prompt"],
    instructions: "Explain simply, no financial advice, no guaranteed outcomes.",
    prompt: "Explain a liquidity sweep on Gold (XAU/USD) in two sentences.",
  },
  {
    icon: Mail,
    tone: "bg-indigo-100 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-400",
    title: "Draft an email",
    text: "Turn a one-line brief into a polite, clear email.",
    tags: ["System prompt"],
    instructions: "Write short, polite, professional emails.",
    prompt: "Ask a supplier to send last month's invoice by Friday.",
  },
  {
    icon: Languages,
    tone: "bg-fuchsia-100 text-fuchsia-600 dark:bg-fuchsia-500/15 dark:text-fuchsia-400",
    title: "Translate text",
    text: "Translate a message while keeping its tone.",
    tags: ["Multilingual"],
    prompt: 'Translate to Spanish and Urdu: "Your account is ready. Sign in to start testing models."',
  },
];

function ChatPlayground() {
  const send = useServerFn(playgroundChat);
  const [model, setModel] = useState<string>(PLAYGROUND_DEFAULT_MODEL);
  const [modelOpen, setModelOpen] = useState(false);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [instructions, setInstructions] = useState("");
  const [maxTokens, setMaxTokens] = useState(1200);
  const [copied, setCopied] = useState<string | null>(null);
  const [codeOpen, setCodeOpen] = useState(false);
  const [files, setFiles] = useState<ChatAttachment[]>([]);
  const [reading, setReading] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);
  const box = useRef<HTMLTextAreaElement>(null);
  const imageInput = useRef<HTMLInputElement>(null);
  const docInput = useRef<HTMLInputElement>(null);

  const info = getCatalogModel(model);
  const last = [...turns].reverse().find((t) => t.role === "assistant" && !t.error);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
  }, [turns, busy]);

  const addFiles = async (list: FileList | null, kind: "image" | "doc") => {
    if (!list?.length) return;
    setReading(true);
    try {
      for (const file of Array.from(list)) {
        if (kind === "image" && files.filter((f) => f.kind === "image").length >= PLAYGROUND_MAX_IMAGES) {
          toast.error(`Up to ${PLAYGROUND_MAX_IMAGES} images per message.`);
          break;
        }
        try {
          const a = await readAttachment(file, kind);
          setFiles((cur) => [...cur, a]);
          if (a.kind === "doc" && a.truncated) toast.message(`${a.name} is long — only the first part is sent.`);
        } catch (e) {
          toast.error(e instanceof Error ? e.message : `Couldn't read ${file.name}.`);
        }
      }
    } finally {
      setReading(false);
    }
  };

  const submit = async () => {
    const typed = input.trim();
    if ((!typed && !files.length) || busy || reading) return;
    const attached = files;
    const content = composeMessage(typed || "Please look at the attached file.", attached);
    const images = attached.flatMap((f) => (f.kind === "image" ? [f.url] : []));
    const userTurn: Turn = {
      id: crypto.randomUUID(),
      role: "user",
      content,
      display: typed,
      files: attached.map((f) => ({ name: f.name, kind: f.kind, url: f.kind === "image" ? f.url : undefined })),
    };
    const history = [...turns.filter((t) => !t.error), userTurn];
    setTurns((t) => [...t, userTurn]);
    setInput("");
    setFiles([]);
    setBusy(true);
    try {
      const res = await send({
        data: {
          model,
          instructions,
          maxTokens,
          images,
          turns: history.map(({ role, content: c }) => ({ role, content: c })),
        },
      });
      setTurns((t) => [
        ...t,
        res.ok
          ? {
              id: crypto.randomUUID(),
              role: "assistant",
              content: res.content,
              model: res.model,
              tokens: res.usage.totalTokens,
              cost: res.cost,
              ms: res.ms,
            }
          : { id: crypto.randomUUID(), role: "assistant", content: res.error, error: true },
      ]);
    } catch {
      setTurns((t) => [
        ...t,
        { id: crypto.randomUUID(), role: "assistant", content: "The model couldn't answer. Please try again.", error: true },
      ]);
    } finally {
      setBusy(false);
      box.current?.focus();
    }
  };

  const pickExample = (ex: Example) => {
    setInstructions(ex.instructions ?? "");
    setInput(ex.prompt);
    if (ex.tags.includes("Image input")) imageInput.current?.click();
    requestAnimationFrame(() => box.current?.focus());
  };

  const copyText = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(id);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      /* ignore */
    }
  };

  const messages = [
    ...(instructions.trim() ? [{ role: "system", content: instructions.trim() }] : []),
    ...turns.filter((t) => !t.error).map((t) => ({ role: t.role, content: t.content })),
    ...(turns.length ? [] : [{ role: "user", content: input.trim() || "Hello!" }]),
  ];
  const sampleCode = `curl ${API_BASE}/chat/completions \\
  -H "Authorization: Bearer $JENVU_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '${JSON.stringify({ model, max_tokens: maxTokens, messages }, null, 2).replace(/'/g, "'\\''")}'`;

  const settings = (
    <div className="space-y-5">
      <div>
        <label htmlFor="pg-instructions" className="text-[13px] font-medium text-foreground">
          System prompt
        </label>
        <textarea
          id="pg-instructions"
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          rows={4}
          maxLength={8000}
          placeholder="e.g. Answer in short bullet points."
          className="mt-2 w-full resize-none rounded-xl border border-border bg-background px-3 py-2 text-[14px] text-foreground outline-none placeholder:text-muted-foreground focus:border-foreground/40"
        />
      </div>
      <div>
        <div className="flex items-center justify-between text-[13px]">
          <label htmlFor="pg-max" className="font-medium text-foreground">Max reply tokens</label>
          <span className="tabular-nums text-muted-foreground">{maxTokens.toLocaleString()}</span>
        </div>
        <input
          id="pg-max"
          type="range"
          min={64}
          max={PLAYGROUND_MAX_TOKENS}
          step={64}
          value={maxTokens}
          onChange={(e) => setMaxTokens(Number(e.target.value))}
          className="mt-3 w-full accent-foreground"
        />
      </div>
      <div className="border-t border-border pt-4 text-[13px] text-muted-foreground">
        <div className="flex justify-between"><span>Price</span><span className="text-foreground">${PRICE_PER_MILLION} / 1M tokens</span></div>
        {last && (
          <>
            <div className="mt-2 flex justify-between"><span>Last reply</span><span className="tabular-nums text-foreground">{last.tokens?.toLocaleString()} tokens</span></div>
            <div className="mt-2 flex justify-between"><span>Cost</span><span className="tabular-nums text-foreground">${(last.cost ?? 0).toFixed(6)}</span></div>
          </>
        )}
      </div>
    </div>
  );

  return (
    <section className="mx-auto flex h-[calc(100dvh-96px)] min-h-[600px] w-full max-w-[1240px] flex-col">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-[28px] font-medium tracking-tight text-foreground">Chat API</h1>
        <div className="flex items-center gap-2">
          {turns.length > 0 && (
            <button type="button" onClick={() => setTurns([])} disabled={busy} className="console-pill disabled:opacity-45">
              <RotateCcw className="h-4 w-4" /> New chat
            </button>
          )}
          <button type="button" onClick={() => setCodeOpen(true)} className="inline-flex items-center gap-1.5 text-[14px] text-muted-foreground hover:text-foreground">
            <Code2 className="h-4 w-4" /> View Code
          </button>
        </div>
      </div>

      {/* Conversation / examples */}
      <div ref={scroller} className="mt-3 min-h-0 flex-1 overflow-y-auto pr-1">
        {turns.length === 0 ? (
          <div className="flex min-h-full flex-col py-2">
            <div className="text-center">
              <h2 className="text-[18px] font-medium text-foreground">Start a chat with examples</h2>
              <p className="mt-1 text-[14px] text-muted-foreground">Pick a use case to see the exact prompt and settings, then make it your own.</p>
            </div>
            <div className="mt-6 grid flex-1 grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:grid-rows-2">
              {EXAMPLES.map((ex) => (
                <button
                  key={ex.title}
                  type="button"
                  onClick={() => pickExample(ex)}
                  className="flex flex-col rounded-2xl border border-border bg-background p-5 text-left transition-colors hover:bg-[var(--console-card)] lg:p-6"
                >
                  <span className={`grid h-9 w-9 place-items-center rounded-full ${ex.tone}`}>
                    <ex.icon className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <span className="mt-4 text-[16px] font-medium text-foreground">{ex.title}</span>
                  <span className="mt-1.5 text-[14px] leading-snug text-muted-foreground">{ex.text}</span>
                  <span className="mt-auto flex flex-wrap gap-1.5 pt-4">
                    {ex.tags.map((t) => (
                      <span key={t} className="rounded-md bg-[var(--console-card)] px-2 py-0.5 text-[12px] text-foreground">{t}</span>
                    ))}
                  </span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-6 pb-4">
            {turns.map((t) =>
              t.role === "user" ? (
                <div key={t.id} className="flex flex-col items-end gap-2">
                  {!!t.files?.length && (
                    <div className="flex max-w-[80%] flex-wrap justify-end gap-2">
                      {t.files.map((f, i) =>
                        f.kind === "image" && f.url ? (
                          <img key={i} src={f.url} alt={f.name} className="h-20 w-20 rounded-xl object-cover" />
                        ) : (
                          <span key={i} className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--console-card)] px-3 py-2 text-[13px] text-foreground">
                            <FileText className="h-4 w-4 text-muted-foreground" /> {f.name}
                          </span>
                        ),
                      )}
                    </div>
                  )}
                  {(t.display ?? t.content) && (
                    <div className="max-w-[80%] whitespace-pre-wrap rounded-2xl bg-[var(--console-card)] px-4 py-2.5 text-[15px] text-foreground">
                      {t.display ?? t.content}
                    </div>
                  )}
                </div>
              ) : (
                <div key={t.id} className="group">
                  {t.error ? (
                    <div className="rounded-xl border border-red-500/30 bg-red-500/5 px-4 py-3 text-[14px] text-red-600 dark:text-red-400">
                      {t.content}
                    </div>
                  ) : (
                    <>
                      <div className="text-[15px] leading-relaxed text-foreground">
                        <MessageResponse>{t.content}</MessageResponse>
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-3 text-[12px] text-muted-foreground">
                        <button type="button" onClick={() => void copyText(t.id, t.content)} className="inline-flex items-center gap-1 hover:text-foreground" aria-label="Copy reply">
                          {copied === t.id ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                          Copy
                        </button>
                        <span>{getCatalogModel(t.model ?? "")?.name ?? t.model}</span>
                        <span className="tabular-nums">{t.tokens?.toLocaleString()} tokens</span>
                        <span className="tabular-nums">{((t.ms ?? 0) / 1000).toFixed(1)}s</span>
                      </div>
                    </>
                  )}
                </div>
              ),
            )}
            {busy && (
              <div className="flex items-center gap-2 text-[14px] text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> {info?.name ?? "Model"} is thinking…
              </div>
            )}
          </div>
        )}
      </div>

      <div className="mx-auto w-full max-w-[640px]">
        {/* Credits notice */}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-[var(--console-card)] px-4 py-3">
          <span className="inline-flex items-start gap-3">
            <Wallet className="mt-0.5 h-4 w-4 shrink-0 text-orange-500" aria-hidden="true" />
            <span>
              <span className="block text-[14px] font-medium text-foreground">Replies use your AI wallet.</span>
              <span className="block text-[12px] text-muted-foreground">${PRICE_PER_MILLION} / 1M tokens, the same as the API.</span>
            </span>
          </span>
          <Link to="/dashboard/billing" className="console-pill-solid rounded-full px-4 py-2 text-[13px] font-medium">
            Add credit
          </Link>
        </div>

        {/* Composer */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
          className="mt-2 rounded-2xl bg-[var(--console-card)] px-4 pb-2.5 pt-3"
        >
          {!!files.length && (
            <div className="mb-2 flex flex-wrap gap-2">
              {files.map((f) => (
                <span key={f.id} className="relative inline-flex items-center gap-1.5 rounded-xl bg-background py-1 pl-1 pr-7 text-[12px] text-foreground">
                  {f.kind === "image" ? (
                    <img src={f.url} alt="" className="h-8 w-8 rounded-lg object-cover" />
                  ) : (
                    <span className="grid h-8 w-8 place-items-center rounded-lg bg-[var(--console-card)]"><FileText className="h-4 w-4 text-muted-foreground" /></span>
                  )}
                  <span className="max-w-[140px] truncate">{f.name}</span>
                  <button
                    type="button"
                    aria-label={`Remove ${f.name}`}
                    onClick={() => setFiles((cur) => cur.filter((x) => x.id !== f.id))}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </span>
              ))}
            </div>
          )}
          <textarea
            ref={box}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void submit();
              }
            }}
            onPaste={(e) => {
              const imgs = Array.from(e.clipboardData.files).filter((f) => f.type.startsWith("image/"));
              if (imgs.length) {
                e.preventDefault();
                const dt = new DataTransfer();
                imgs.forEach((f) => dt.items.add(f));
                void addFiles(dt.files, "image");
              }
            }}
            rows={1}
            placeholder="Ask anything"
            aria-label="Message"
            className="max-h-40 min-h-[28px] w-full resize-none bg-transparent text-[15px] text-foreground outline-none placeholder:text-muted-foreground"
          />
          <input ref={imageInput} type="file" accept={IMAGE_ACCEPT} multiple hidden onChange={(e) => { void addFiles(e.target.files, "image"); e.target.value = ""; }} />
          <input ref={docInput} type="file" accept={DOC_ACCEPT} multiple hidden onChange={(e) => { void addFiles(e.target.files, "doc"); e.target.value = ""; }} />
          <div className="mt-1.5 flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-1">
              <DropdownMenu modal={false}>
                <DropdownMenuTrigger asChild>
                  <button type="button" aria-label="Attach files" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border text-foreground hover:bg-background">
                    {reading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" side="top" className="w-56 rounded-xl">
                  <DropdownMenuItem onSelect={() => imageInput.current?.click()}>
                    <ImageIcon className="h-4 w-4" /> Upload image
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => docInput.current?.click()}>
                    <Paperclip className="h-4 w-4" /> Upload document
                    <span className="ml-auto text-[11px] text-muted-foreground">PDF, TXT, code</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Popover>
                <PopoverTrigger asChild>
                  <button type="button" aria-label="Chat settings" className="inline-flex h-8 items-center gap-1.5 rounded-full px-2.5 text-[13px] text-foreground hover:bg-background">
                    <SlidersHorizontal className="h-4 w-4" />
                    <span className="hidden sm:inline">{maxTokens.toLocaleString()} tokens · Text</span>
                  </button>
                </PopoverTrigger>
                <PopoverContent align="start" side="top" className="w-[min(340px,90vw)] rounded-2xl p-4">
                  <div className="mb-4 text-[14px] font-medium text-foreground">System prompt &amp; parameters</div>
                  {settings}
                </PopoverContent>
              </Popover>
            </div>
            <div className="flex min-w-0 items-center gap-1">
              <Popover open={modelOpen} onOpenChange={setModelOpen}>
                <PopoverTrigger asChild>
                  <button type="button" aria-label="Choose a model" className="inline-flex min-w-0 items-center gap-1 rounded-full px-2.5 py-1.5 text-[14px] text-foreground hover:bg-background">
                    <span className="truncate">{info?.name ?? model}</span>
                    <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                  </button>
                </PopoverTrigger>
                <PopoverContent align="end" side="top" className="max-h-[360px] w-[min(320px,90vw)] overflow-y-auto rounded-2xl p-1.5">
                  {MIXED_CATALOG.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => {
                        setModel(m.id);
                        setModelOpen(false);
                      }}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left hover:bg-[var(--console-card)]"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[14px] text-foreground">{m.name}</span>
                        <span className="block text-[12px] text-muted-foreground">
                          {PROVIDERS[m.provider].label} · {formatContext(m.context)}
                        </span>
                      </span>
                      {m.id === model && <Check className="h-4 w-4 shrink-0 text-foreground" />}
                    </button>
                  ))}
                </PopoverContent>
              </Popover>
              <button
                type="submit"
                disabled={(!input.trim() && !files.length) || busy || reading}
                aria-label="Send"
                className="console-pill-solid flex h-8 w-8 shrink-0 items-center justify-center rounded-full disabled:opacity-40"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUp className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* View code */}
      <Dialog open={codeOpen} onOpenChange={setCodeOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Use this chat in your code</DialogTitle>
          </DialogHeader>
          <div className="code-box relative max-h-[60vh] overflow-auto rounded-2xl p-4">
            <button
              type="button"
              onClick={() => void copyText("code", sampleCode)}
              aria-label="Copy code"
              className="code-box-copy absolute right-3 top-3 rounded-md p-1.5"
            >
              {copied === "code" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </button>
            <pre className="whitespace-pre-wrap break-words pr-8 font-mono text-[13px] leading-relaxed"><code>{highlight(sampleCode)}</code></pre>
          </div>
          <p className="text-[13px] text-muted-foreground">
            Create a key on{" "}
            <Link to="/dashboard/api" className="text-foreground underline underline-offset-2">API Keys</Link>{" "}
            and set it as <span className="font-mono">JENVU_API_KEY</span>.
          </p>
        </DialogContent>
      </Dialog>
    </section>
  );
}
