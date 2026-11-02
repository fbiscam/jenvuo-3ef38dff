import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowUp,
  Bot,
  Braces,
  CandlestickChart,
  Check,
  ChevronDown,
  Code2,
  Copy,
  Download,
  FileText,
  ImageIcon,
  Lightbulb,
  LineChart,
  Loader2,
  Newspaper,
  Paperclip,
  Plus,
  RotateCw,
  SlidersHorizontal,
  SquarePen,
  ThumbsDown,
  ThumbsUp,
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
import { Shimmer } from "@/components/ai-elements/shimmer";
import { ChatSitePanel } from "@/components/dashboard/ChatSitePanel";
import { inspectSite, type SiteReport } from "@/lib/site-inspect.functions";
import { siteInspectTarget } from "@/lib/site-inspect";
import JenvuMark from "@/components/JenvuMark";
import { Button } from "@/components/ui/button";
import { ProviderLogo } from "@/components/models/ModelsExplorer";
import { readSiteTheme, SITE_THEME_EVENT } from "@/lib/site-theme";
import { highlight } from "@/components/dashboard/CodeHighlight";
import { MIXED_CATALOG, PROVIDERS, PRICE_PER_MILLION, formatContext, getCatalogModel } from "@/lib/model-catalog";
import { playgroundChat } from "@/lib/playground.functions";
import { PLAYGROUND_DEFAULT_MODEL, PLAYGROUND_MAX_TOKENS, type PlaygroundTurn } from "@/lib/playground";
import { DOC_ACCEPT, IMAGE_ACCEPT, composeMessage, readAttachment, type ChatAttachment } from "@/components/dashboard/chat-attachments";
import {
  CHAT_MAX_FILES,
  FRAME_MAX_ITEMS,
  findMentionedFile,
  frameLimitBlock,
  frameUsed,
  type FrameAsk,
  type FrameState,
  codeRequestKind,
  shortFileName,
  extractReplyDocument,
  extractReplyFiles,
  looksLikeDocRequest,
  looksLikeImageRequest,
  mergeWorkspace,
  wantsNewFile,
  parseRenameRequest,
  workspaceContext,
  type CodeKind,
  type ReplyDocument,
  type ReplyFile,
} from "@/lib/chat-files";
import { ChatCodeStudio, type StudioTab } from "@/components/dashboard/ChatCodeStudio";
import { ChatDocView, exportDocumentPdf } from "@/components/dashboard/ChatDocView";
import { useAuthUser } from "@/hooks/useAuthUser";
import { chatSessionKey, parseSavedSession, toSavedSession } from "@/lib/chat-session";
import { streamImage, ImageStreamError } from "@/lib/stream-image";
import { supabase } from "@/integrations/supabase/client";

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
  /** A picture the AI created (not kept in browser storage). */
  image?: string;
  imageFinal?: boolean;
};

type ImageView = { turnId: string; prompt: string; url?: string; final: boolean };

const API_BASE = "https://jenvu.com/api/public/v1";

// System prompt for the two builder cards: whole files, nothing left out.
const CODE_BUILDER =
  "You are an expert trading-code engineer (MQL5 for MetaTrader 5, Pine Script v6 for TradingView). Write the COMPLETE file from the first line to the last — no placeholders, no 'rest of code', no TODOs. Put the whole file in ONE fenced code block tagged with its language (```mql5 or ```pine) and start it with a comment like // File: Name.mq5. Every trade must have a stop loss. After the code, give 3 short setup steps. Never promise profits.";

// Always sent first: the trading and coding knowledge every reply builds on.
const JENVU_BRAIN = [
  "You are Jenvu AI, an expert trading assistant and senior trading-software engineer.",
  "Markets: forex, Gold (XAU/USD), indices and crypto. You know ICT and SMC deeply: market structure (HH/HL/LH/LL, BOS, CHoCH, MSS), liquidity (BSL/SSL, equal highs/lows, PDH/PDL, sweeps and runs), order blocks, breakers, mitigation blocks, FVG/IFVG/BPR, premium/discount and OTE 62-79%, Power of Three, London and New York killzones, Silver Bullet, session opens, and multi-timeframe top-down analysis. Also classic tools: EMA/SMA, RSI, MACD, ATR, volume, support/resistance, risk-reward and position sizing.",
  "Coding: expert in MQL5 (MetaTrader 5 EAs, indicators, CTrade, CPositionInfo, OnInit/OnTick/OnDeinit, new-bar checks, lot sizing from balance, SL/TP, trailing stops, magic numbers, spread and session filters), Pine Script v6 (indicator/strategy, ta.*, request.security, alerts, boxes, labels, tables) and Python for backtests and data.",
  "When asked for code: write the COMPLETE working file in one fenced block tagged with its language, starting with a comment like // File: Name.mq5; no placeholders or TODOs; every trade gets a stop loss. When asked to change existing code, return the whole updated file with the same file name. Then give short setup steps.",
  "Before writing code, check the request has what you need: platform (MT5/MQL5, TradingView/Pine Script or Python), symbol, timeframe, entry and exit rules, and risk per trade. If something important is missing or unclear, do NOT write code yet: ask up to 3 short numbered questions in the chat and wait for the answer. If the request is already clear, write the code straight away.",
  "When asked for a PDF, report, guide or document: put the whole document in ONE fenced block tagged ```document written in Markdown (never put ``` inside it). First line: a short UPPERCASE kicker; then '# Title'; then numbered '## 1. Section' headings, '> **Callout title**' blockquotes for formulas and key notes, and tables where they help. The page turns it into a PDF. After the block, add one short line only.",
  "When asked for a NEW or separate file, write it under a new file name and leave the open files as they are; the editor holds up to 2 files and the page shows 1 document (PDF) at a time.",
  "File names are short: at most 2 words plus the extension, e.g. GoldSweep.mq5 or rsi_bot.py. Document titles are at most 4 words.",
  "Leads lists, SEO / website reports, proposals, articles, emails, CVs and any long written piece go in ONE ```document block so they open in the frame beside the chat; in the chat itself write only one short line.",
  "The page creates pictures itself when the user asks for an image, so never say you can't make images.",
  "Leads (e.g. 'Google Maps leads for dentists'): if no business type or city is given, ask for the business type, city/country and how many leads (the page then searches Google Maps live). When a [Live Google Maps data] block is present, build the ```document from it: a short intro and ONE table: Business | Category | Address | Phone | Website | Rating | Reviews (+ Emails when given) | Maps link, with every row and value exactly as given. Never invent businesses, phones, emails or addresses (the page exports the table as PDF and CSV).",
  "When a [Live content of …] or [Live web results …] block is present, base the website / SEO report or answer on that real data and cite links; never invent rankings, traffic or numbers you can't see.",
  "Upwork proposals: if the job post isn't given, ask for it. Then write a proposal under 200 words: a first line that names the client's exact problem (no 'Dear Sir', no 'I am writing to'), 2-3 lines of relevant proof, a short step-by-step plan, timeline, one smart question about the project, and a friendly call to action. Plain, confident, specific; no buzzwords, no invented reviews or past clients. Put it in a ```document block.",
  "You can read attached images and documents; use what they show.",
  "Be accurate and concise. Never claim personal trading experience, never promise profits or guaranteed returns, and note that trading carries risk when giving trade ideas.",
  "When you ask the user a question, end the reply with ONE line exactly like: [[choices: first suggested answer | second suggested answer]] — 2 or 3 short answers the user can click. Never use it when you are not asking anything.",
].join("\n");

// AI-suggested answers: a trailing [[choices: a | b]] line becomes clickable chips.
const CHOICES_RE = /\[\[\s*choices\s*:([^\]]*)\]\]/i;
function extractChoices(text: string): string[] {
  const m = CHOICES_RE.exec(text);
  if (!m?.[1]) return [];
  return m[1].split("|").map((s) => s.trim()).filter(Boolean).slice(0, 3);
}
function stripChoices(text: string): string {
  return text.replace(new RegExp(CHOICES_RE.source, "gi"), "").trimEnd();
}

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
    icon: Bot,
    tone: "bg-orange-100 text-orange-600 dark:bg-orange-500/15 dark:text-orange-400",
    title: "Build an MT5 bot",
    text: "A complete MQL5 Expert Advisor, ready to download.",
    tags: ["MQL5", "Download file"],
    instructions: CODE_BUILDER,
    prompt: "Build a Gold (XAUUSD) M15 Expert Advisor: EMA 50/200 trend filter, entry on closed candles, stop loss on every trade, 0.02 lot per $1,000 balance, max 1 trade at a time.",
  },
  {
    icon: CandlestickChart,
    tone: "bg-teal-100 text-teal-600 dark:bg-teal-500/15 dark:text-teal-400",
    title: "Build a TradingView script",
    text: "A full Pine Script v6 indicator or strategy file.",
    tags: ["Pine Script", "Download file"],
    instructions: CODE_BUILDER,
    prompt: "Build a Pine Script v6 indicator that marks Fair Value Gaps and swing highs/lows on Gold, with alerts.",
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
  const [votes, setVotes] = useState<Record<string, "up" | "down">>({});
  const vote = (id: string, dir: "up" | "down") => {
    const undo = votes[id] === dir;
    setVotes((v) => {
      const next = { ...v };
      if (undo) delete next[id];
      else next[id] = dir;
      return next;
    });
    if (!undo) toast.success(dir === "up" ? "Thanks — glad this helped." : "Thanks — we'll use this to improve.");
  };
  const [codeOpen, setCodeOpen] = useState(false);
  const [files, setFiles] = useState<ChatAttachment[]>([]);
  // The last file the user sent; it opens in its own tab of the work area.
  const [uploaded, setUploaded] = useState<ChatAttachment | null>(null);
  const [reading, setReading] = useState(false);
  const [darkMenus, setDarkMenus] = useState(false);
  // Editor files (max 4) and the open document live across replies.
  const [workspace, setWorkspace] = useState<ReplyFile[]>([]);
  const [activeFile, setActiveFile] = useState(0);
  const [doc, setDoc] = useState<ReplyDocument | null>(null);
  const [docOpen, setDocOpen] = useState(false);
  // Once code is asked for, the editor stays open (even while the AI asks questions).
  const [codePinned, setCodePinned] = useState<CodeKind | null>(null);
  // Which tab of the left work area is in front; code, picture and document all stay open.
  const [pane, setPane] = useState<"code" | "image" | "doc" | "upload" | "site">("code");
  const [site, setSite] = useState<{ domain: string; report: SiteReport | null } | null>(null);
  const runInspect = useServerFn(inspectSite);
  const [imageView, setImageView] = useState<ImageView | null>(null);
  // What the frame beside the chat holds right now (max 4 items).
  const frameNow: FrameState = { codeFiles: workspace.length, image: !!imageView, doc: !!doc && docOpen, upload: !!uploaded, site: !!site };
  const [imaging, setImaging] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);
  const box = useRef<HTMLTextAreaElement>(null);
  const imageInput = useRef<HTMLInputElement>(null);
  const docInput = useRef<HTMLInputElement>(null);
  const { user } = useAuthUser();
  const [restored, setRestored] = useState(false);

  // The chat stays (refresh, other pages, signing out) until New chat is clicked.
  useEffect(() => {
    if (!user?.id) return;
    const saved = parseSavedSession(window.localStorage.getItem(chatSessionKey(user.id)));
    if (saved) {
      setTurns(saved.turns as Turn[]);
      setWorkspace(saved.workspace);
      if (saved.workspace.length) setCodePinned("generic");
      setActiveFile(saved.activeFile);
      setDoc(saved.doc);
      setDocOpen(saved.docOpen);
      // Chat always opens on the default model (Claude Opus 5.5); an old saved pick is not restored.
    }
    setRestored(true);
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id || !restored) return;
    const key = chatSessionKey(user.id);
    try {
      if (!turns.length && !workspace.length && !doc) window.localStorage.removeItem(key);
      else window.localStorage.setItem(key, JSON.stringify(toSavedSession({ turns, workspace, activeFile, doc, docOpen, model })));
    } catch {
      /* storage full or blocked: the chat still works, it just isn't kept */
    }
  }, [user?.id, restored, turns, workspace, activeFile, doc, docOpen, model]);

  const info = getCatalogModel(model);
  const last = [...turns].reverse().find((t) => t.role === "assistant" && !t.error);

  useEffect(() => {
    const syncTheme = () => setDarkMenus(readSiteTheme() === "dark");
    syncTheme();
    window.addEventListener(SITE_THEME_EVENT, syncTheme);
    return () => window.removeEventListener(SITE_THEME_EVENT, syncTheme);
  }, []);
  const menuTheme = darkMenus ? "dark" : "";

  // Follow new messages only when the reader is already at the bottom.
  const [awayFromBottom, setAwayFromBottom] = useState(false);
  const awayRef = useRef(false);
  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const onScroll = () => {
      const away = el.scrollHeight - el.scrollTop - el.clientHeight > 120;
      awayRef.current = away;
      setAwayFromBottom(away);
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);
  useEffect(() => {
    if (awayRef.current) return;
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
  }, [turns, busy]);

  const addFiles = async (list: FileList | null, kind: "image" | "doc") => {
    if (!list?.length) return;
    setReading(true);
    try {
      for (const file of Array.from(list)) {
        try {
          const a = await readAttachment(file, kind);
          // One upload at a time: a new pick replaces the previous one.
          if (files.length) toast.message(`Only 1 file per message — ${a.name} replaced the previous one.`);
          setFiles([a]);
          if (a.kind === "doc" && a.truncated) toast.message(`${a.name} is long — only the first part is sent.`);
        } catch (e) {
          toast.error(e instanceof Error ? e.message : `Couldn't read ${file.name}.`);
        }
      }
    } finally {
      setReading(false);
    }
  };

  // Sends the conversation (ending with a user turn) and appends the reply.
  // The editor files (and an open document) ride on the last user message only,
  // so the AI can edit, rename or move code between them.
  const ask = async (history: Turn[], images: string[]) => {
    setBusy(true);
    try {
      const sent = history.filter((t) => !t.error).map(({ role, content: c }) => ({ role, content: c }));
      const full = frameUsed(frameNow) >= FRAME_MAX_ITEMS || workspace.length >= CHAT_MAX_FILES;
      const extra =
        workspaceContext(workspace) +
        (full
          ? `\n\n[The frame is full (${frameUsed(frameNow)}/${FRAME_MAX_ITEMS} files, ${workspace.length}/${CHAT_MAX_FILES} code). You may change an open file, but never create a new file: if a new file is needed, tell the user to remove one file with the ✕ on its tab and try again.]`
          : "") +
        (doc && docOpen ? `\n\n[Document open on the page — to change it, return the WHOLE updated document in one \`\`\`document block]\n${doc.markdown}` : "");
      const lastMsg = sent[sent.length - 1];
      if (extra && lastMsg?.role === "user") sent[sent.length - 1] = { ...lastMsg, content: lastMsg.content + extra };
      const res = await send({
        data: {
          model,
          instructions: [JENVU_BRAIN, instructions.trim()].filter(Boolean).join("\n\n"),
          maxTokens,
          images,
          turns: sent,
        },
      });
      let limitNote: string | null = null;
      if (res.ok) {
        const newFiles = extractReplyFiles(res.content);
        if (newFiles.length) {
          const lastUser = [...history].reverse().find((t) => t.role === "user");
          const otherItems = frameUsed({ ...frameNow, codeFiles: 0 });
          const room = Math.max(0, Math.min(CHAT_MAX_FILES, FRAME_MAX_ITEMS - otherItems));
          const merged = mergeWorkspace(workspace, newFiles, Math.max(room, workspace.length), wantsNewFile(lastUser?.display ?? lastUser?.content ?? ""));
          setWorkspace(merged.files);
          const fresh = merged.files.findIndex((x) => !workspace.some((w) => w.name === x.name));
          const changed = merged.files.findIndex((x) => newFiles.some((n) => n.name.toLowerCase() === x.name.toLowerCase()));
          const askedIdx = findMentionedFile(lastUser?.display ?? lastUser?.content ?? "", merged.files.map((x) => x.name));
          const activeChanged = merged.files[activeFile] && newFiles.some((n) => n.name.toLowerCase() === merged.files[activeFile]!.name.toLowerCase());
          const first = fresh >= 0 ? fresh : askedIdx >= 0 ? askedIdx : activeChanged ? activeFile : changed;
          if (first >= 0) setActiveFile(first);
          if (merged.dropped.length)
            limitNote = `**${merged.dropped.join(", ")}** couldn't open: the frame is full (max ${FRAME_MAX_ITEMS} files, ${CHAT_MAX_FILES} of them code). Please remove one file with the ✕ on its tab, then try again.`;
          setPane("code");
          setCodePinned((k) => k ?? "generic");
        }
        const newDoc = extractReplyDocument(res.content);
        if (newDoc) {
          setDoc(newDoc);
          setDocOpen(true);
          setPane("doc");
        }
      }
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
        ...(limitNote ? [{ id: crypto.randomUUID(), role: "assistant" as const, content: limitNote, model: "local" }] : []),
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

  const renameFile = (from: string, to: string): string | null => {
    const clean = to.trim().replace(/\s+/g, "_");
    if (!/^[\w\-]+\.[A-Za-z0-9]{1,5}$/.test(clean)) return "Use a name like Strategy.pine (letters, numbers, _ or -, then an extension).";
    if (workspace.some((f) => f.name.toLowerCase() === clean.toLowerCase() && f.name !== from)) return `${clean} is already open.`;
    setWorkspace((cur) => cur.map((f) => (f.name === from ? { ...f, name: clean } : f)));
    return null;
  };

  const removeFile = (name: string) => {
    const idx = workspace.findIndex((f) => f.name === name);
    setWorkspace((cur) => cur.filter((f) => f.name !== name));
    setActiveFile((a) => Math.max(0, a > idx || a === workspace.length - 1 ? a - 1 : a));
  };

  // "image banao": the picture is drawn live in the frame on the left (and in the chat on phones).
  const makeImage = async (prompt: string) => {
    const userTurn: Turn = { id: crypto.randomUUID(), role: "user", content: prompt, display: prompt };
    const replyId = crypto.randomUUID();
    setTurns((t) => [...t, userTurn, { id: replyId, role: "assistant", content: `Image created for: "${prompt}"`, model: "image" }]);
    setInput("");
    setImageView({ turnId: replyId, prompt, final: false });
    setPane("image");
    setBusy(true);
    setImaging(true);
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      await streamImage(
        "/api/chat-image",
        { prompt },
        (url, final) => {
          setImageView((v) => (v && v.turnId === replyId ? { ...v, url, final } : v));
          setTurns((t) => t.map((x) => (x.id === replyId ? { ...x, image: url, imageFinal: final } : x)));
        },
        undefined,
        token ? { Authorization: `Bearer ${token}` } : undefined,
      );
    } catch (e) {
      const status = e instanceof ImageStreamError ? e.status : 0;
      const msg =
        status === 402
          ? "AI credits are used up, so the image couldn't be made right now."
          : status === 429
            ? "Too many image requests. Please wait a moment and try again."
            : e instanceof Error && e.message
              ? e.message
              : "The image couldn't be created. Please try again.";
      setImageView((v) => (v?.turnId === replyId ? null : v));
      setTurns((t) => t.map((x) => (x.id === replyId ? { id: x.id, role: "assistant", content: msg, error: true } : x)));
    } finally {
      setBusy(false);
      setImaging(false);
      box.current?.focus();
    }
  };

  // `override` sends a clicked suggestion right away, without the message box.
  const submit = async (override?: string) => {
    const typed = (override ?? input).trim();
    if ((!typed && !files.length) || busy || reading) return;
    // Frame full (4 files, or 2 code files): say so and ask to remove one first, no AI call.
    const mentioned = findMentionedFile(typed, workspace.map((f) => f.name));
    const isImage = !files.length && looksLikeImageRequest(typed);
    const isDoc = looksLikeDocRequest(typed);
    const siteAsk = !files.length ? siteInspectTarget(typed) : null;
    const codeAsk = !isDoc && codeRequestKind(`${typed} ${instructions === CODE_BUILDER ? "code bot" : ""}`) !== null;
    const frameAsk: FrameAsk = files.length
      ? "upload"
      : isImage
        ? "image"
        : isDoc
          ? "doc"
          : siteAsk
            ? "site"
            : codeAsk
              ? (wantsNewFile(typed) || workspace.length === 0) && mentioned < 0
                ? "code-new"
                : "code-edit"
              : null;
    const blocked = frameLimitBlock(frameAsk, frameNow);
    if (blocked) {
      setTurns((t) => [
        ...t,
        { id: crypto.randomUUID(), role: "user", content: typed, display: typed },
        { id: crypto.randomUUID(), role: "assistant", content: blocked, model: "local" },
      ]);
      setInput("");
      return;
    }
    // Talking about an open file moves the frame to it.
    if (mentioned >= 0) {
      setActiveFile(mentioned);
      setPane("code");
    } else if (!isImage && imageView && /\b(image|picture|pic|photo|tasveer|tasvir)\b/i.test(typed)) setPane("image");
    else if (!isDoc && doc && docOpen && /\b(document|doc|pdf|report|proposal|leads?)\b/i.test(typed)) setPane("doc");
    if (isImage) {
      await makeImage(typed);
      return;
    }
    const kindAsked = looksLikeDocRequest(typed) ? null : codeRequestKind(`${typed} ${instructions === CODE_BUILDER ? "code bot" : ""}`);
    if (kindAsked) setCodePinned(kindAsked);
    // "rename a.py to b.py" is done right here — no AI call, no cost.
    const rename = !files.length ? parseRenameRequest(typed, workspace.map((f) => f.name), workspace[activeFile]?.name) : null;
    if (rename) {
      const problem = renameFile(rename.from, rename.to);
      setTurns((t) => [
        ...t,
        { id: crypto.randomUUID(), role: "user", content: typed, display: typed },
        problem
          ? { id: crypto.randomUUID(), role: "assistant", content: problem, error: true }
          : { id: crypto.randomUUID(), role: "assistant", content: `Renamed **${rename.from}** to **${rename.to.trim().replace(/\s+/g, "_")}**.`, model: "local" },
      ]);
      setInput("");
      return;
    }
    const siteTarget = siteAsk;
    if (siteTarget) {
      setSite({ domain: siteTarget, report: null });
      setPane("site");
      runInspect({ data: { domain: siteTarget } })
        .then((report) => setSite((cur) => (cur?.domain === siteTarget ? { domain: siteTarget, report } : cur)))
        .catch(() => setSite(null));
    }
    const attached = files;
    const target = mentioned >= 0 ? workspace[mentioned]?.name : undefined;
    const content =
      composeMessage(typed || "Please look at the attached file.", attached) +
      (target ? `\n\n[The user means the open file ${target}: make the change in that file and return it with the same name.]` : "");
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
    if (attached[0]) {
      setUploaded(attached[0]);
      setPane("upload");
    }
    await ask(history, images);
  };

  // Drops the chosen reply (and anything after it) and asks again.
  const regenerate = (replyId: string) => {
    if (busy) return;
    const idx = turns.findIndex((t) => t.id === replyId);
    if (idx < 0) return;
    const kept = turns.slice(0, idx);
    if (kept[kept.length - 1]?.role !== "user") return;
    const lastUser = kept[kept.length - 1];
    if (turns[idx]?.model === "image" || (turns[idx]?.error && looksLikeImageRequest(lastUser.display ?? ""))) {
      setTurns(kept.slice(0, -1));
      void makeImage(lastUser.display ?? lastUser.content);
      return;
    }
    const images = (lastUser.files ?? []).flatMap((f) => (f.kind === "image" && f.url ? [f.url] : []));
    setTurns(kept);
    void ask(kept, images);
  };

  const newChat = () => {
    setTurns([]);
    setWorkspace([]);
    setUploaded(null);
    setActiveFile(0);
    setDoc(null);
    setDocOpen(false);
    setCodePinned(null);
    setImageView(null);
  };

  const pickExample = (ex: Example) => {
    setInstructions(ex.instructions ?? "");
    if (ex.instructions === CODE_BUILDER) setMaxTokens(PLAYGROUND_MAX_TOKENS);
    setInput(ex.prompt);
    if (ex.tags.includes("Image input")) imageInput.current?.click();
    requestAnimationFrame(() => box.current?.focus());
  };

  const lastAsked = [...turns].reverse().find((t) => t.role === "user");
  const docAsked = looksLikeDocRequest(lastAsked?.display ?? "");
  const askedKind = docAsked ? null : codeRequestKind(`${lastAsked?.display ?? ""} ${instructions === CODE_BUILDER ? "code bot" : ""}`);
  const codingNow = busy && !imaging && !docAsked && (askedKind !== null || codePinned !== null);
  const writingDoc = busy && docAsked;
  const showDoc = !!doc && docOpen;
  const showImage = !!imageView;
  const studio = !!site || !!uploaded || workspace.length > 0 || codingNow || showDoc || writingDoc || codePinned !== null || showImage;
  const studioKind = askedKind ?? codePinned ?? (workspace[0]?.lang === "pine" ? "pine" : workspace[0]?.lang === "python" ? "python" : workspace[0]?.lang === "mql5" ? "mql5" : "generic");
  const studioSeed = turns.length;

  const downloadFile = (name: string, code: string) => {
    const url = URL.createObjectURL(new Blob([code], { type: "text/plain;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const downloadImage = (url: string, prompt: string) => {
    const a = document.createElement("a");
    a.href = url;
    a.download = `jenvu_${prompt.toLowerCase().replace(/[^a-z0-9]+/g, "_").slice(0, 40) || "image"}.png`;
    a.click();
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
          className="mt-2 w-full resize-none rounded-lg border border-border bg-muted/40 px-3 py-3 text-[14px] leading-relaxed text-foreground outline-none placeholder:text-muted-foreground focus:border-foreground/40 focus:ring-2 focus:ring-ring/15"
        />
      </div>
      <div>
        <div className="text-[13px] font-medium text-foreground">Effort</div>
        <div role="radiogroup" aria-label="Effort" className="mt-2 grid grid-cols-3 gap-1 rounded-lg bg-muted p-1">
          {EFFORTS.map((e) => (
            <button
              key={e.id}
              type="button"
              role="radio"
              aria-checked={effort.id === e.id}
              onClick={() => setMaxTokens(e.tokens)}
              className={`rounded-md px-2 py-1.5 text-[13px] transition-colors ${effort.id === e.id ? "bg-background font-medium text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            >
              {e.label}
            </button>
          ))}
        </div>
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
    <section className="chat-shell flex min-h-[440px] w-full flex-col">
      <h1 className="sr-only">Chat</h1>
      {/* Controls: only before the chat starts; afterwards they sit next to the model picker. */}
      {turns.length === 0 && (
        <div className="flex items-center justify-end gap-2">
          <button type="button" onClick={() => setCodeOpen(true)} className="inline-flex items-center gap-1.5 text-[14px] text-muted-foreground hover:text-foreground">
            <Code2 className="h-4 w-4" /> View Code
          </button>
        </div>
      )}

      <div className={studio ? "flex min-h-0 flex-1 gap-6 pt-2" : "contents"}>
      {studio && (() => {
        const hasCode = workspace.length > 0 || codingNow || codePinned !== null;
        const ids = [
          ...(hasCode ? ["code" as const] : []),
          ...(showImage ? ["image" as const] : []),
          ...(showDoc || writingDoc ? ["doc" as const] : []),
          ...(uploaded ? ["upload" as const] : []),
          ...(site ? ["site" as const] : []),
        ];
        const front = ids.some((id) => id === pane) ? pane : (ids[0] ?? "code");
        const used = frameUsed(frameNow);
        const twoWords = (t: string) => t.split(/\s+/).filter(Boolean).slice(0, 2).join(" ");
        const extraTabs: StudioTab[] = [
          ...(showImage ? [{ id: "image", label: "Image", icon: "image" as const, active: front === "image", onOpen: () => setPane("image"), onClose: () => setImageView(null) }] : []),
          ...(showDoc || writingDoc ? [{ id: "doc", label: doc && showDoc ? twoWords(doc.title) || "Document" : "Document", icon: "doc" as const, active: front === "doc", onOpen: () => setPane("doc"), onClose: () => setDocOpen(false) }] : []),
          ...(uploaded ? [{ id: "upload", label: shortFileName(uploaded.name), icon: "file" as const, active: front === "upload", onOpen: () => setPane("upload"), onClose: () => setUploaded(null) }] : []),
          ...(site ? [{ id: "site", label: site.domain, icon: "site" as const, active: front === "site", onOpen: () => setPane("site"), onClose: () => setSite(null) }] : []),
        ];
        return (
        <div className="hidden min-h-0 min-w-0 flex-1 flex-col lg:flex">
          <ChatCodeStudio
            files={workspace}
            busy={busy}
            kind={studioKind}
            seed={studioSeed}
            active={Math.min(activeFile, Math.max(workspace.length - 1, 0))}
            onActive={(i) => { setActiveFile(i); setPane("code"); }}
            onDownload={(f) => downloadFile(f.name, f.code)}
            onRename={(from, to) => {
              const problem = renameFile(from, to);
              if (problem) toast.error(problem);
            }}
            onRemove={removeFile}
            onClose={() => setCodePinned(null)}
            hasCode={hasCode}
            codeActive={front === "code"}
            extraTabs={extraTabs}
            count={`${used}/4`}
          >
            {front === "site" && site ? (
              <ChatSitePanel embedded domain={site.domain} report={site.report} loading={!site.report} onClose={() => setSite(null)} />
            ) : front === "upload" && uploaded ? (
              uploaded.kind === "image" ? (
                <div className="flex min-h-0 flex-1 items-center justify-center p-4">
                  <img src={uploaded.url} alt={uploaded.name} className="max-h-full max-w-full rounded-lg object-contain" />
                </div>
              ) : (
                <pre className="chat-no-scrollbar min-h-0 flex-1 overflow-auto whitespace-pre-wrap break-words p-4 font-mono text-[13px] leading-relaxed">{uploaded.text}</pre>
              )
            ) : front === "image" && imageView ? (
              <ChatImagePanel view={imageView} onDownload={(url) => downloadImage(url, imageView.prompt)} />
            ) : front === "doc" && showDoc && doc ? (
              <ChatDocView embedded doc={doc} busy={busy} menuTheme={menuTheme} onClose={() => setDocOpen(false)} />
            ) : (
              <div className="flex min-h-0 flex-1 items-center justify-center text-[15px]">
                <Shimmer>Writing your document…</Shimmer>
              </div>
            )}
          </ChatCodeStudio>
        </div>
        );
      })()}
      <div className={studio ? "flex min-h-0 w-full flex-col lg:w-[480px] lg:shrink-0" : "contents"}>
      {/* Conversation / examples */}
      <div ref={scroller} className="chat-no-scrollbar mt-1 min-h-0 flex-1 overflow-y-auto">
        {turns.length === 0 ? (
          <div className="flex flex-col pt-6 pb-2">
            <div className="text-center">
              <h2 className="text-[18px] font-medium text-foreground">Start a chat with examples</h2>
              <p className="mt-1 text-[14px] text-muted-foreground">Pick a use case to see the exact prompt and settings, then make it your own.</p>
            </div>
            <div className="mx-auto mt-8 grid w-full max-w-[1400px] grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {EXAMPLES.map((ex) => (
                <button
                  key={ex.title}
                  type="button"
                  onClick={() => pickExample(ex)}
                  className="flex min-h-[170px] flex-col rounded-2xl border border-border bg-background p-5 text-left transition-colors hover:bg-[var(--console-card)]"
                >
                  <span className={`grid h-8 w-8 place-items-center rounded-full ${ex.tone}`}>
                    <ex.icon className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <span className="mt-3 text-[15px] font-medium text-foreground">{ex.title}</span>
                  <span className="mt-1 text-[13px] leading-snug text-muted-foreground">{ex.text}</span>
                  <span className="mt-auto flex flex-wrap gap-1.5 pt-3">
                    {ex.tags.map((t) => (
                      <span key={t} className="rounded-md bg-[var(--console-card)] px-2 py-0.5 text-[12px] text-foreground">{t}</span>
                    ))}
                  </span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-9 pb-6 pt-2">
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
                    <div className="max-w-[80%] whitespace-pre-wrap break-words rounded-2xl bg-[var(--console-card)] px-5 py-3 text-[16px] leading-[1.65] text-foreground">
                      {t.display ?? t.content}
                    </div>
                  )}
                </div>
              ) : (
                <div key={t.id} className="min-w-0">
                  {t.error ? (
                    <div className="rounded-xl bg-red-500/5 px-4 py-3 text-[14px] text-red-600 dark:text-red-400">
                      {t.content}
                      <button type="button" onClick={() => regenerate(t.id)} disabled={busy} className="ml-2 font-medium text-foreground underline-offset-2 hover:underline disabled:opacity-50">
                        Try again
                      </button>
                    </div>
                  ) : (
                    t.model === "image" ? (
                      <div>
                        {t.image ? (
                          <>
                            {/* Phones: the picture shows here. Desktop: only in the frame on the left. */}
                            <button
                              type="button"
                              onClick={() => setImageView({ turnId: t.id, prompt: t.display ?? t.content, url: t.image, final: !!t.imageFinal })}
                              className="block overflow-hidden rounded-2xl lg:hidden"
                              aria-label="Open image"
                            >
                              <img src={t.image} alt="AI image" className={`max-h-[320px] w-auto max-w-full transition-[filter] duration-500 ${t.imageFinal ? "blur-0" : "blur-2xl"}`} />
                            </button>
                            <button
                              type="button"
                              onClick={() => { setImageView({ turnId: t.id, prompt: t.display ?? t.content, url: t.image, final: !!t.imageFinal }); setPane("image"); }}
                              className="hidden items-center gap-2 rounded-full bg-[var(--console-card)] px-3.5 py-2 text-[14px] text-foreground lg:inline-flex"
                            >
                              <ImageIcon className="h-4 w-4 text-muted-foreground" /> {t.imageFinal ? "Image is open in the frame" : "Creating image in the frame…"}
                            </button>
                          </>
                        ) : busy && imaging ? (
                          <div className="text-[16px]"><Shimmer>Creating your image…</Shimmer></div>
                        ) : (
                          <p className="text-[14px] text-muted-foreground">Image not kept after reload. Click regenerate to make it again.</p>
                        )}
                        <div className="mt-3 flex items-center gap-1 text-muted-foreground">
                          {t.image && t.imageFinal && (
                            <button type="button" onClick={() => downloadImage(t.image ?? "", t.content)} className="ring-btn mr-2 inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[13px] font-medium lg:hidden">
                              <Download className="h-3.5 w-3.5" /> Download image
                            </button>
                          )}
                          <span className="mr-auto text-[12px]">AI images may include mistakes</span>
                          <ReplyBtn label="Regenerate" disabled={busy} onClick={() => regenerate(t.id)}>
                            <RotateCw className="h-[18px] w-[18px]" />
                          </ReplyBtn>
                        </div>
                      </div>
                    ) : (
                    <>
                      <div className={`text-[16px] leading-[1.7] text-foreground [&_li]:my-1 [&_p]:my-3 [&_ul]:my-3 [&_ul]:pl-5 ${studio ? "lg:hidden" : ""}`}>
                        <MessageResponse>{unwrapDocument(stripChoices(t.content))}</MessageResponse>
                      </div>
                      {studio && (
                        <div className="hidden text-[16px] leading-[1.7] text-foreground lg:block [&_li]:my-1 [&_p]:my-3 [&_ul]:my-3 [&_ul]:pl-5">
                          <MessageResponse>{stripCode(stripChoices(t.content))}</MessageResponse>
                        </div>
                      )}
                      {(() => {
                        const replyFiles = extractReplyFiles(t.content);
                        const replyDoc = extractReplyDocument(t.content);
                        if (!replyFiles.length && !replyDoc) return null;
                        return (
                          <div className="mt-3 flex flex-wrap gap-2.5">
                            {replyDoc && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (!exportDocumentPdf(replyDoc)) toast.error("Allow pop-ups for this site to save the PDF.");
                                  }}
                                  className="ring-btn inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[13px] font-medium"
                                >
                                  <Download className="h-3.5 w-3.5" /> Download PDF
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setDoc(replyDoc);
                                    setDocOpen(true);
                                  }}
                                  className="hidden items-center gap-1.5 rounded-full bg-[var(--console-card)] px-3.5 py-1.5 text-[13px] font-medium text-foreground lg:inline-flex"
                                >
                                  <FileText className="h-3.5 w-3.5" /> Open document
                                </button>
                              </>
                            )}
                            {replyFiles.map((f) => (
                              <button
                                key={f.name}
                                type="button"
                                onClick={() => downloadFile(f.name, f.code)}
                                className="ring-btn inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[13px] font-medium"
                              >
                                <Download className="h-3.5 w-3.5" /> Download {f.name}
                              </button>
                            ))}
                          </div>
                        );
                      })()}
                      {(() => {
                        const choices = extractChoices(t.content);
                        if (!choices.length || t.id !== turns[turns.length - 1]?.id || busy) return null;
                        return (
                          <div className="mt-4 flex flex-col gap-2">
                            {choices.map((c) => (
                              <button
                                key={c}
                                type="button"
                                onClick={() => {
                                  setInput("");
                                  void submit(c);
                                }}
                                className="w-fit max-w-full rounded-2xl border border-dashed border-foreground/30 px-4 py-2 text-left text-[14px] text-foreground hover:border-foreground/60 hover:bg-[var(--console-card)]"
                              >
                                {c}
                              </button>
                            ))}
                            <button
                              type="button"
                              onClick={() => {
                                setInput("");
                                box.current?.focus();
                              }}
                              className="w-fit rounded-2xl px-4 py-2 text-left text-[14px] text-muted-foreground hover:text-foreground"
                            >
                              Something else? Type your own answer below…
                            </button>
                          </div>
                        );
                      })()}
                      {t.model !== "local" && (() => {
                        const cm = getCatalogModel(t.model ?? "");
                        return (
                          <div className="mt-4 flex h-6 flex-wrap items-center gap-2 leading-none text-[12px] text-muted-foreground">
                            {cm && <ProviderLogo provider={cm.provider} size="sm" bare />}
                            <span className="font-medium text-foreground">{cm?.name ?? t.model}</span>
                            {typeof t.tokens === "number" && <span className="inline-flex h-6 items-center rounded-full bg-[var(--console-card)] px-2 tabular-nums text-foreground">{t.tokens.toLocaleString()} tokens</span>}
                            <span className="tabular-nums">{((t.ms ?? 0) / 1000).toFixed(1)}s</span>
                          </div>
                        );
                      })()}
                      <div className="mt-2 flex h-8 items-center gap-1 text-muted-foreground">
                        <span className="mr-auto min-w-0 truncate text-[12px] leading-none">
                          {t.model === "local" ? "Done in the editor" : "AI responses may include mistakes"}
                        </span>
                        <ReplyBtn label="Good response" active={votes[t.id] === "up"} onClick={() => vote(t.id, "up")}>
                          <ThumbsUp className="h-[18px] w-[18px]" fill={votes[t.id] === "up" ? "currentColor" : "none"} />
                        </ReplyBtn>
                        <ReplyBtn label="Bad response" active={votes[t.id] === "down"} onClick={() => vote(t.id, "down")}>
                          <ThumbsDown className="h-[18px] w-[18px]" fill={votes[t.id] === "down" ? "currentColor" : "none"} />
                        </ReplyBtn>
                        <ReplyBtn label="Regenerate" disabled={busy} onClick={() => regenerate(t.id)}>
                          <RotateCw className="h-[18px] w-[18px]" />
                        </ReplyBtn>
                        <ReplyBtn label="Copy reply" onClick={() => void copyText(t.id, t.content)}>
                          {copied === t.id ? <Check className="h-[18px] w-[18px]" /> : <Copy className="h-[18px] w-[18px]" />}
                        </ReplyBtn>
                      </div>
                    </>
                    )
                  )}
                </div>
              ),
            )}
            {busy && !imaging && (
              <div className="flex gap-3" role="status">
                <JenvuMark className="mt-0.5 h-6 w-6 shrink-0 animate-pulse" />
                <div className="min-w-0 flex-1">
                  <div className="text-[16px]">
                    <Shimmer>{codingNow ? `${info?.name ?? "Jenvu"} is writing your code…` : `${info?.name ?? "Jenvu"} is thinking…`}</Shimmer>
                  </div>
                  {codingNow && (
                    <div className="code-box mt-3 max-w-[560px] rounded-xl p-4 lg:hidden font-mono text-[13px] leading-relaxed">
                      <div className="chat-code-line" style={{ animationDelay: "0s" }}><span className="text-sky-600 dark:text-sky-400">input</span> double Lots = <span className="text-amber-600 dark:text-amber-400">0.02</span>;</div>
                      <div className="chat-code-line" style={{ animationDelay: "0.35s" }}><span className="text-violet-600 dark:text-violet-400">void</span> OnTick() {"{"}</div>
                      <div className="chat-code-line pl-5" style={{ animationDelay: "0.7s" }}><span className="text-emerald-600 dark:text-emerald-400">// entry rules, stop loss, take profit</span></div>
                      <div className="chat-code-line" style={{ animationDelay: "1.05s" }}>{"}"}<span className="jx-caret ml-0.5 inline-block h-[1.05em] w-[7px] translate-y-[2px] bg-foreground" /></div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
        {awayFromBottom && turns.length > 0 && (
          <div className="pointer-events-none sticky bottom-3 z-10 mx-auto flex w-full max-w-[760px] justify-center">
            <button
              type="button"
              aria-label="Scroll to latest message"
              onClick={() => scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" })}
              className="pointer-events-auto grid h-9 w-9 place-items-center rounded-full border border-border bg-background text-foreground shadow-md hover:bg-muted"
            >
              <ChevronDown className="h-5 w-5" />
            </button>
          </div>
        )}
      </div>

      <div className="w-full">

        {/* Composer */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
          className="mt-2 chat-composer rounded-2xl border border-border bg-[var(--console-card)] px-4 pb-2.5 pt-3"
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
            placeholder={studio ? "Ask the AI to change the code…" : "Ask anything"}
            aria-label="Message"
            className="max-h-40 min-h-[28px] w-full resize-none bg-transparent text-[16px] text-foreground outline-none placeholder:text-muted-foreground"
          />
          <input ref={imageInput} type="file" accept={IMAGE_ACCEPT} hidden onChange={(e) => { void addFiles(e.target.files, "image"); e.target.value = ""; }} />
          <input ref={docInput} type="file" accept={DOC_ACCEPT} hidden onChange={(e) => { void addFiles(e.target.files, "doc"); e.target.value = ""; }} />
          <div className="mt-1.5 flex flex-nowrap items-end justify-between gap-x-2">
            <div className="-ml-2 flex min-w-0 shrink-0 items-center gap-0.5">
              <DropdownMenu modal={false}>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon-sm" type="button" aria-label="Attach files" className="shrink-0 rounded-full text-foreground hover:bg-background">
                    {reading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" side="top" sideOffset={10} className={`${menuTheme} w-[min(260px,90vw)] rounded-xl border-border bg-background p-2 text-foreground shadow-lg`}>
                  <DropdownMenuItem className="cursor-pointer gap-3 rounded-lg px-3 py-3 text-[14px] focus:bg-muted focus:text-foreground" onSelect={() => imageInput.current?.click()}>
                    <ImageIcon className="h-4 w-4" /> Add photos
                  </DropdownMenuItem>
                  <DropdownMenuItem className="cursor-pointer gap-3 rounded-lg px-3 py-3 text-[14px] focus:bg-muted focus:text-foreground" onSelect={() => docInput.current?.click()}>
                    <Paperclip className="h-4 w-4" /> Add documents
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="sm" type="button" aria-label="Chat settings" className="gap-1.5 rounded-full px-2.5 text-[13px] text-foreground hover:bg-background">
                    <SlidersHorizontal className="h-4 w-4" />
                    <span className="hidden whitespace-nowrap sm:inline">{maxTokens.toLocaleString()} tokens</span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="start" side="top" sideOffset={10} className={`${menuTheme} w-[min(340px,90vw)] rounded-xl border-border bg-background p-5 text-foreground shadow-lg`}>
                  <div className="mb-5 flex items-center gap-2.5 border-b border-border pb-4 text-[14px] font-medium text-foreground"><SlidersHorizontal className="h-4 w-4 text-muted-foreground" />System prompt &amp; parameters</div>
                  {settings}
                </PopoverContent>
              </Popover>
            </div>
            <div className="ml-auto flex min-w-0 items-center gap-1">
              {turns.length > 0 && (
                <>
                  <Button variant="ghost" size="icon-sm" type="button" onClick={newChat} disabled={busy} aria-label="New chat" title="New chat" className="shrink-0 rounded-full text-foreground hover:bg-background">
                    <SquarePen className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon-sm" type="button" onClick={() => setCodeOpen(true)} aria-label="View code" title="View code" className="shrink-0 rounded-full text-foreground hover:bg-background">
                    <Code2 className="h-4 w-4" />
                  </Button>
                </>
              )}
              <Popover open={modelOpen} onOpenChange={setModelOpen}>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="sm" type="button" aria-label="Choose a model" className="min-w-0 gap-2 rounded-full px-2.5 text-[14px] text-foreground hover:bg-background">
                    {info && <ProviderLogo provider={info.provider} size="sm" bare />}
                    <span className="max-w-[150px] truncate">{info?.name ?? model}</span>
                    <ChevronDown className="h-4 w-4 shrink-0 text-foreground opacity-70" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="end" side="top" sideOffset={10} className={`${menuTheme} max-h-[360px] w-[min(340px,90vw)] overflow-y-auto rounded-xl border-border bg-background p-2 text-foreground shadow-lg`}>
                  {MIXED_CATALOG.map((m) => (
                    <Button
                      variant="ghost"
                      key={m.id}
                      type="button"
                      onClick={() => {
                        setModel(m.id);
                        setModelOpen(false);
                      }}
                      className="h-auto w-full justify-start gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-muted"
                    >
                      <ProviderLogo provider={m.provider} size="sm" bare />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[14px] text-foreground">{m.name}</span>
                        <span className="block text-[12px] text-muted-foreground">
                          {PROVIDERS[m.provider].label} · {formatContext(m.context)}
                        </span>
                      </span>
                      {m.id === model && <Check className="h-4 w-4 shrink-0 text-foreground" />}
                    </Button>
                  ))}
                </PopoverContent>
              </Popover>
              <button
                type="submit"
                disabled={(!input.trim() && !files.length) || busy || reading}
                aria-label="Send"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border bg-[var(--chat-send-bg,#fff)] text-[var(--chat-send-fg,#000)] shadow-sm transition-opacity disabled:opacity-35"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUp className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </form>
      </div>
      </div>
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

/** Left frame: the picture being created (blurred until it's finished). Its tab sits in the frame's tab row. */
function ChatImagePanel({ view, onDownload }: { view: ImageView; onDownload: (url: string) => void }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden p-6">
        {view.url ? (
          <img src={view.url} alt={view.prompt} className={`max-h-full max-w-full rounded-xl object-contain transition-[filter] duration-500 ${view.final ? "blur-0" : "blur-2xl"}`} />
        ) : (
          <div className="flex flex-col items-center gap-3 text-[15px]">
            <Loader2 className="h-6 w-6 animate-spin opacity-60" />
            <Shimmer>Creating your image…</Shimmer>
          </div>
        )}
      </div>
      <div className="flex items-center gap-2 border-t border-current/10 px-4 py-2 text-[12px]">
        <span className="min-w-0 flex-1 truncate opacity-70">
          {view.final ? "Done · Download it or ask for another image" : <span className="inline-flex items-center gap-2"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Drawing your image…</span>}
        </span>
        {view.url && view.final && (
          <button type="button" onClick={() => onDownload(view.url ?? "")} className="ring-btn inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[13px] font-medium">
            <Download className="h-3.5 w-3.5" /> Download
          </button>
        )}
      </div>
    </div>
  );
}

/** Reply text without its code blocks (the code is shown in the editor). */
function stripCode(text: string): string {
  return text
    .replace(/```document[\s\S]*?(```|$)/gi, "\n_The document is open on the left._\n")
    .replace(/```[\s\S]*?(```|$)/g, "\n_Code is in the editor._\n")
    .trim();
}

/** Shows a ```document block as normal formatted text (phones, no side view). */
function unwrapDocument(text: string): string {
  return text.replace(/```document[^\n]*\n([\s\S]*?)(```|$)/gi, "$1");
}

function ReplyBtn({ label, active, disabled, onClick, children }: { label: string; active?: boolean; disabled?: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      aria-pressed={active}
      className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-[var(--console-card)] hover:text-foreground disabled:opacity-40 ${active ? "bg-[var(--console-card)] text-foreground" : ""}`}
    >
      {children}
    </button>
  );
}
