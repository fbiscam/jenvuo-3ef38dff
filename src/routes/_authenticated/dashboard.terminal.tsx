import JenvuMark from "@/components/JenvuMark";
import { parseChartCommands } from "@/lib/chart/chart-commands";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useCredits } from "@/hooks/useCredits";
import { useEffect, useRef, useState } from "react";
import type * as React from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  CornerDownRight,
  History,
  ImagePlus,
  ListChecks,
  Mic,
  Moon,
  Newspaper,
  PanelRightClose,
  Square,
  SquarePen,
  Sun,
  Trash2,
  X,
} from "lucide-react";
import type { FileUIPart } from "ai";
import { analyzeGold, type GoldSignal } from "@/lib/gold-analysis.functions";
import { getGoldNews, MAX_NEWS, type NewsEvent } from "@/lib/news.functions";
import { toast } from "sonner";
import {
  JenvuChartWorkspace,
  type JenvuChartHandle,
} from "@/components/terminal/JenvuChartWorkspace";
import { TerminalWatchlist } from "@/components/terminal/TerminalWatchlist";
import { hasWeekendClose, parseChartAsset, type ChartAsset } from "@/components/terminal/terminal-assets";
import { transcribeVoiceMessage } from "@/lib/transcription.functions";
import { cn } from "@/lib/utils";
import { isMarketClosed } from "@/lib/signals/qualification";
import { sessionAnchor, sessionBucketMs } from "@/lib/chart/session-buckets";
import { Button } from "@/components/ui/button";
import { TooltipProvider } from "@/components/ui/tooltip";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import {
  PromptInputActionAddAttachments,
  PromptInputActionMenu,
  PromptInputActionMenuContent,
  PromptInputActionMenuTrigger,
  PromptInput,
  PromptInputFooter,
  PromptInputHeader,
  PromptInputButton,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
  usePromptInputAttachments,
} from "@/components/ai-elements/prompt-input";
import {
  Attachment,
  AttachmentPreview,
  AttachmentRemove,
  Attachments,
} from "@/components/ai-elements/attachments";
import { Shimmer } from "@/components/ai-elements/shimmer";

export const Route = createFileRoute("/_authenticated/dashboard/terminal")({
  head: () => ({
    meta: [
      { title: "Jenvu Terminal — Gold, BTC/USD & EUR/USD Charts" },
      {
        name: "description",
        content:
          "Live Gold (XAU/USD), BTC/USD and EUR/USD charts with drawing tools, multiple timeframes and a built-in AI desk that reads the chart with you.",
      },
      { property: "og:title", content: "Jenvu Terminal — Gold, BTC/USD & EUR/USD Charts" },
      {
        property: "og:description",
        content: "Chart Gold, BTC/USD and EUR/USD and ask the Jenvu AI desk about the setup in one screen.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: TerminalPage,
});

const TIMEFRAMES = [
  { key: "1m", tv: "1", label: "1m" },
  { key: "3m", tv: "3", label: "3m" },
  { key: "5m", tv: "5", label: "5m" },
  { key: "10m", tv: "10", label: "10m" },
  { key: "15m", tv: "15", label: "15m" },
  { key: "30m", tv: "30", label: "30m" },
  { key: "45m", tv: "45", label: "45m" },
  { key: "1h", tv: "60", label: "1H" },
  { key: "2h", tv: "120", label: "2H" },
  { key: "3h", tv: "180", label: "3H" },
  { key: "4h", tv: "240", label: "4H" },
  { key: "6h", tv: "360", label: "6H" },
  { key: "12h", tv: "720", label: "12H" },
  { key: "1d", tv: "D", label: "1D" },
];

// Chart questions are answered from the desk's deterministic chart read
// (chartRef.describe()) plus verified server-side market data — no screenshot
// is attached, so every question routes to the OmniRoute text chain.

type ChatMsg = {
  role: "user" | "assistant";
  text: string;
  signal?: GoldSignal;
  files?: FileUIPart[];
  /** Pair + timeframe of the chart read with this question, e.g. "XAU/USD 1H". */
  chartSynced?: string;
};

type ChatThread = {
  id: string;
  title: string;
  updatedAt: number;
  messages: ChatMsg[];
};

const THREADS_KEY = "jenvu:terminal:threads:v1";
const TERMINAL_SETTINGS_KEY = "jenvu:terminal:settings:v1";

function candleSecondsLeft(tvInterval: string): number {
  const now = Date.now();
  // Same 17:00 New York session buckets the chart candles use (TradingView-style).
  if (tvInterval === "D") {
    const next = sessionAnchor(now) + 86_400_000;
    return Math.max(0, Math.ceil((next - now) / 1000));
  }
  const minutes = Number(tvInterval);
  if (!Number.isFinite(minutes) || minutes <= 0) return 0;
  const period = minutes * 60_000;
  const end = Math.min(sessionBucketMs(now, period) + period, sessionAnchor(now) + 86_400_000);
  return Math.max(0, Math.ceil((end - now) / 1000));
}

function formatCountdown(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (value: number) => String(value).padStart(2, "0");
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${pad(minutes)}:${pad(seconds)}`;
}

function formatNewYorkNewsTime(isoDate: string): { date: string; time: string } {
  const date = new Date(isoDate);
  return {
    date: new Intl.DateTimeFormat("en-US", {
      timeZone: "America/New_York",
      month: "short",
      day: "numeric",
    }).format(date),
    time: new Intl.DateTimeFormat("en-US", {
      timeZone: "America/New_York",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(date),
  };
}

function UpcomingGoldNews({
  event,
  loading,
  failed,
  wrap,
}: {
  event?: NewsEvent;
  loading: boolean;
  failed?: boolean;
  wrap?: boolean;
}) {
  const stamp = event ? formatNewYorkNewsTime(event.date) : null;
  const live = event ? new Date(event.date).getTime() <= Date.now() : false;
  const text = loading
    ? "Checking news…"
    : event && stamp
      ? `${live ? "Released" : ""}${live && event.impact === "High" ? " (High)" : ""}${live ? ": " : ""}${event.title} · ${stamp.date}, ${stamp.time} NY`
      : failed
        ? "News feed unavailable — check calendar"
        : "No important news ahead";
  return (
    <span
      className={cn(
        "flex items-start gap-1.5 px-1 text-xs font-normal leading-snug text-muted-foreground",
        // Desktop keeps the whole line readable (wraps instead of cutting the date/time off).
        // Phones: one full line inside the scrollable toolbar, never cut short.
        wrap
          ? "w-full"
          : "shrink-0 whitespace-nowrap md:max-w-[430px] md:min-w-[150px] md:whitespace-normal",
      )}
      title={text}
    >
      <Newspaper
        aria-hidden="true"
        className={cn(
          "h-3.5 w-3.5 shrink-0",
          event?.impact === "High" ? "text-red-500" : event ? "text-orange-500" : "text-amber-500",
        )}
      />
      <span className="min-w-0 break-words">{text}</span>
    </span>
  );
}

const QUICK = [
  "Analyse the current chart",
  "Where is liquidity sitting?",
  "Is there a valid setup right now?",
];

const MAX_IMAGE_BYTES = 3 * 1024 * 1024;

function pendingLabel(query: string, hasImage: boolean): string {
  if (hasImage) return "Reviewing your chart…";
  const tradingQuery =
    /\b(eur|eurusd|euro|gold|xau|chart|trade|trading|setup|signal|entry|buy|sell|long|short|analysis|analyze|bias|price|trend|level|zone|liquidity|fvg|order\s*block|bos|choch|smc|ict|killzone|scalp|swing)\b/i.test(
      query,
    );
  return tradingQuery ? "Reviewing XAU/USD structure…" : "Preparing your answer…";
}

function ComposerAttachments() {
  const attachments = usePromptInputAttachments();
  if (attachments.files.length === 0) return null;
  return (
    <PromptInputHeader>
      <Attachments variant="grid">
        {attachments.files.map((file) => (
          <Attachment data={file} key={file.id} onRemove={() => attachments.remove(file.id)}>
            <AttachmentPreview />
            <AttachmentRemove className="opacity-100" />
          </Attachment>
        ))}
      </Attachments>
    </PromptInputHeader>
  );
}

function encodeWav(chunks: Float32Array[], inputRate: number): Blob {
  const sourceLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const source = new Float32Array(sourceLength);
  let offset = 0;
  for (const chunk of chunks) {
    source.set(chunk, offset);
    offset += chunk.length;
  }
  const outputRate = 16_000;
  const ratio = inputRate / outputRate;
  const sampleCount = Math.max(0, Math.floor(source.length / ratio));
  const buffer = new ArrayBuffer(44 + sampleCount * 2);
  const view = new DataView(buffer);
  const write = (position: number, value: string) => {
    for (let index = 0; index < value.length; index += 1)
      view.setUint8(position + index, value.charCodeAt(index));
  };
  write(0, "RIFF");
  view.setUint32(4, 36 + sampleCount * 2, true);
  write(8, "WAVE");
  write(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, outputRate, true);
  view.setUint32(28, outputRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  write(36, "data");
  view.setUint32(40, sampleCount * 2, true);
  for (let index = 0; index < sampleCount; index += 1) {
    const sample = Math.max(-1, Math.min(1, source[Math.floor(index * ratio)] ?? 0));
    view.setInt16(44 + index * 2, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
  }
  return new Blob([buffer], { type: "audio/wav" });
}

async function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () =>
      typeof reader.result === "string"
        ? resolve(reader.result)
        : reject(new Error("Recording could not be read."));
    reader.onerror = () => reject(new Error("Recording could not be read."));
    reader.readAsDataURL(blob);
  });
}

function TerminalPage() {
  const [tf, setTf] = useState(TIMEFRAMES[3]);
  const [asset, setAsset] = useState<ChartAsset>("XAUUSD");
  // Daily terminal access fee ($0.30 per UTC day, charged once server-side).
  useEffect(() => {
    void import("@/integrations/supabase/client").then(({ supabase }) =>
      (supabase.rpc as any)("charge_terminal_daily_access").then(({ error }: { error: { message?: string } | null }) => {
        if (error) console.warn("Terminal daily fee not charged:", error.message);
      }),
    );
  }, []);
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem("jenvu-terminal-asset");
      setAsset(parseChartAsset(saved));
    } catch {
      /* storage unavailable */
    }
  }, []);
  const changeAsset = (next: ChartAsset) => {
    setAsset(next);
    try {
      window.localStorage.setItem("jenvu-terminal-asset", next);
    } catch {
      /* storage unavailable */
    }
  };
  const [deskOpen, setDeskOpen] = useState(false);
  const [deskDrag, setDeskDrag] = useState({ x: 0, y: 0 });
  useEffect(() => {
    const open = () => setDeskOpen(true);
    window.addEventListener("jenvu:terminal-ask-ai", open);
    return () => window.removeEventListener("jenvu:terminal-ask-ai", open);
  }, []);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  // Only an explicit pick (side-rail switch or Settings) turns the Terminal dark.
  const pickedLookRef = useRef<"light" | "dark" | null>(null);
  const [watchlistOpen, setWatchlistOpen] = useState(true);
  // Trading layout (order panel, positions, market watch, technicals, risk) — on by default.
  const [panelsOpen, setPanelsOpen] = useState(true);
  // The watchlist fills the right side whenever the AI desk is closed.
  // Watchlist removed at user request; chart uses the full width.
  const showWatchlist = watchlistOpen && !deskOpen;
  const chartRef = useRef<JenvuChartHandle | null>(null);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [marketClosed, setMarketClosed] = useState(false);
  const [voiceError, setVoiceError] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const messagesRef = useRef<ChatMsg[]>([]);
  const sendLockedRef = useRef(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const audioSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const audioProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const audioChunksRef = useRef<Float32Array[]>([]);
  const hydratedRef = useRef(false);
  const activeThreadIdRef = useRef<string | null>(null);
  const analyze = useServerFn(analyzeGold);
  const transcribe = useServerFn(transcribeVoiceMessage);
  const fetchGoldNews = useServerFn(getGoldNews);
  const newsQuery = useQuery({
    queryKey: ["terminal-gold-news"],
    queryFn: fetchGoldNews,
    staleTime: 5 * 60_000,
    refetchInterval: 5 * 60_000,
    refetchIntervalInBackground: false,
    retry: 2,
  });
  // Re-evaluate every 30s so a release moves from "upcoming" to "released" on time.
  const [newsNow, setNewsNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNewsNow(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, []);
  // Show the nearest important event; keep it on screen for 30 min after release.
  const relevantNews = (newsQuery.data ?? []).filter(
    (event: NewsEvent) => new Date(event.date).getTime() > newsNow - 30 * 60_000,
  );
  const nextGoldNews: NewsEvent | undefined = relevantNews[0];

  // Pop-up reminders 30 min, 5 min before and at release — visible even when
  // the AI desk hides the news strip.
  const newsAlertedRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    for (const event of relevantNews) {
      const mins = (new Date(event.date).getTime() - newsNow) / 60_000;
      const stage = mins <= 0 && mins > -5 ? "now" : mins <= 5 && mins > 0 ? "5" : mins <= 30 && mins > 5 ? "30" : null;
      if (!stage) continue;
      const key = `${event.date}|${event.title}|${stage}`;
      if (newsAlertedRef.current.has(key)) continue;
      newsAlertedRef.current.add(key);
      const stamp = formatNewYorkNewsTime(event.date);
      const lead = stage === "now" ? "Releasing now" : `In ${Math.max(1, Math.round(mins))} min`;
      const show = event.impact === "High" ? toast.warning : toast.info;
      // One-line pill, same look as every other site notification.
      show(`${lead}: ${event.country} ${event.title} · ${event.impact} · ${stamp.time} NY`, {
        duration: stage === "30" ? 10_000 : 20_000,
      });
    }
  }, [relevantNews, newsNow]);

  function addMessage(message: ChatMsg) {
    const previous = messagesRef.current.at(-1);
    if (
      message.role === "assistant" &&
      previous?.role === "assistant" &&
      previous.text.trim() === message.text.trim()
    ) {
      return;
    }
    const nextMessages = [...messagesRef.current, message];
    messagesRef.current = nextMessages;
    setMessages(nextMessages);
    // The thread id is resolved outside the state updater so the updater stays
    // pure — an impure updater silently dropped saved chats in development.
    let threadId = activeThreadIdRef.current;
    const isNewThread = !threadId;
    if (!threadId) {
      threadId = `terminal-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
      activeThreadIdRef.current = threadId;
      setActiveThreadId(threadId);
    }
    const id = threadId;
    const stamp = Date.now();
    setThreads((current) => {
      const exists = current.some((thread) => thread.id === id);
      const base =
        exists || !isNewThread
          ? current
          : [
              {
                id,
                title: message.role === "user" ? message.text.slice(0, 48) : "New chat",
                updatedAt: stamp,
                messages: [] as ChatMsg[],
              },
              ...current,
            ];
      const withThread = base.some((thread) => thread.id === id)
        ? base
        : [{ id, title: "New chat", updatedAt: stamp, messages: [] as ChatMsg[] }, ...base];
      return withThread
        .map((thread) =>
          thread.id === id
            ? {
                ...thread,
                title:
                  thread.title === "New chat" && message.role === "user"
                    ? message.text.slice(0, 48)
                    : thread.title,
                updatedAt: stamp,
                messages: [...thread.messages, { ...message, files: undefined }].slice(-80),
              }
            : thread,
        )
        .sort((a, b) => b.updatedAt - a.updatedAt);
    });
  }

  function startNewChat() {
    activeThreadIdRef.current = null;
    setActiveThreadId(null);
    messagesRef.current = [];
    setMessages([]);
    setHistoryOpen(false);
    requestAnimationFrame(() => textareaRef.current?.focus());
  }

  function loadThread(thread: ChatThread) {
    activeThreadIdRef.current = thread.id;
    setActiveThreadId(thread.id);
    messagesRef.current = thread.messages;
    setMessages(thread.messages);
    setHistoryOpen(false);
  }

  function deleteThread(id: string) {
    setThreads((current) => current.filter((thread) => thread.id !== id));
    if (activeThreadIdRef.current === id) startNewChat();
  }

  const credits = useCredits();
  const ask = useMutation({
    mutationFn: async ({
      query,
      chartImage,
      history,
      chartContext,
    }: {
      query: string;
      chartImage?: string;
      history?: Array<{ role: "user" | "assistant"; content: string }>;
      chartContext?: string;
    }) =>
      analyze({
        data: { timeframe: tf.key, asset, query, chartImage, history, chartContext, advisor: true },
      }),
    onSuccess: (signal) => {
      addMessage({
        role: "assistant",
        text: signal.fullAnalysis || signal.spokenSummary || "No read available.",
        signal,
      });
      credits.refresh();
    },
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : "";
      addMessage({
        role: "assistant",
        text: /INSUFFICIENT_CREDITS|Low balance/i.test(message)
          ? "Your credit balance is too low for AI replies. Upgrade your plan from Payments or wait for your monthly credit. Charts, indicators and zones keep working without credits."
          : /Daily token limit/i.test(message)
            ? message
            : /not included|Upgrade to/i.test(message)
              ? "AI chat is included with Pro, Elite and Ultra. Upgrade to keep asking the desk; charts and tools stay available during your Terminal access."
              : "The desk could not answer just now. Please try again in a moment.",
      });
    },
  });
  const loadingLabel = pendingLabel(ask.variables?.query ?? "", Boolean(ask.variables?.chartImage));

  const voice = useMutation({
    mutationFn: async (audioDataUrl: string) => transcribe({ data: { audioDataUrl } }),
    onSuccess: ({ text }) => {
      setInput((current) => (current ? `${current} ${text}` : text));
      setVoiceError("");
      requestAnimationFrame(() => textareaRef.current?.focus());
    },
    onError: (error: unknown) =>
      setVoiceError(error instanceof Error ? error.message : "Voice transcription failed."),
  });

  useEffect(() => {
    try {
      const storedThreads = JSON.parse(window.localStorage.getItem(THREADS_KEY) || "null") as {
        threads?: ChatThread[];
        activeThreadId?: string | null;
      } | null;
      const savedThreads = Array.isArray(storedThreads?.threads) ? storedThreads.threads : [];
      const savedActiveId = storedThreads?.activeThreadId ?? savedThreads[0]?.id ?? null;
      setThreads(savedThreads);
      setActiveThreadId(savedActiveId);
      activeThreadIdRef.current = savedActiveId;
      const savedMessages = savedThreads.find((thread) => thread.id === savedActiveId)?.messages ?? [];
      messagesRef.current = savedMessages;
      setMessages(savedMessages);

      const settings = JSON.parse(window.localStorage.getItem(TERMINAL_SETTINGS_KEY) || "null") as {
        timeframe?: string;
        theme?: "light" | "dark";
        look?: "light" | "dark";
        pickedLook?: "light" | "dark";
        deskOpen?: boolean;
        watchlistOpen?: boolean;
        tradingPanels?: boolean;
      } | null;
      const savedTimeframe = TIMEFRAMES.find((timeframe) => timeframe.key === settings?.timeframe);
      if (savedTimeframe) setTf(savedTimeframe);
      if (settings?.watchlistOpen === false) setWatchlistOpen(false);
      // White is the default; only an explicit pick turns the Terminal dark.
      if (settings?.pickedLook === "dark" || settings?.pickedLook === "light") {
        pickedLookRef.current = settings.pickedLook;
        setTheme(settings.pickedLook);
      }
      // The AI desk always starts closed so the chart opens exactly as left.
    } catch {
      // Keep a clean workspace if saved browser data is unavailable or malformed.
    } finally {
      hydratedRef.current = true;
    }
  }, []);

  useEffect(() => {
    if (!hydratedRef.current) return;
    try {
      window.localStorage.setItem(THREADS_KEY, JSON.stringify({ threads, activeThreadId }));
    } catch {
      setVoiceError("Chat history storage is full. Remove an older chat and try again.");
    }
  }, [threads, activeThreadId]);

  useEffect(() => {
    if (!hydratedRef.current) return;
    window.localStorage.setItem(
      TERMINAL_SETTINGS_KEY,
      JSON.stringify({ timeframe: tf.key, deskOpen, theme, look: theme, pickedLook: pickedLookRef.current, watchlistOpen, tradingPanels: panelsOpen }),
    );
  }, [tf.key, deskOpen, theme, watchlistOpen, panelsOpen]);

  useEffect(() => {
    // Gold weekend (Fri 21:00 → Sun 22:00 UTC): the last candle has closed, so
    // the timer stops at 00:00 like TradingView instead of counting new candles.
    const tick = () => {
      const closed = hasWeekendClose(asset) && isMarketClosed(new Date());
      setMarketClosed(closed);
      setSecondsLeft(closed ? 0 : candleSecondsLeft(tf.tv));
    };
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [tf.tv, asset]);

  useEffect(() => {
    if (!ask.isPending && !voice.isPending && !isRecording) textareaRef.current?.focus();
  }, [ask.isPending, voice.isPending, isRecording]);

  useEffect(
    () => () => {
      audioStreamRef.current?.getTracks().forEach((track) => track.stop());
      audioProcessorRef.current?.disconnect();
      audioSourceRef.current?.disconnect();
      void audioContextRef.current?.close();
    },
    [],
  );

  async function send(message: { text: string; files?: FileUIPart[] }) {
    const image = message.files?.find((file) => file.mediaType?.startsWith("image/") && file.url);
    const query = message.text.trim() || (image ? "Analyze this chart screenshot." : "");
    if (!query || sendLockedRef.current || ask.isPending) return;
    // Chart commands ("add RSI", "switch to 4H") run directly on the live chart.
    const commands = image ? [] : parseChartCommands(query, TIMEFRAMES.map((t) => t.key));
    if (commands.length) {
      const done: string[] = [];
      for (const c of commands) {
        if (c.kind === "timeframe") {
          const next = TIMEFRAMES.find((t) => t.key === c.key);
          if (next) { setTf(next); done.push(`timeframe → ${next.label}`); }
        } else if (chartRef.current?.setIndicator(c.id, c.on)) {
          done.push(`${c.on ? "added" : "removed"} ${c.id.toUpperCase()}`);
        }
      }
      if (done.length) {
        addMessage({ role: "user", text: query });
        addMessage({ role: "assistant", text: `Done on the chart: ${done.join(", ")}.` });
        setInput("");
        return;
      }
    }
    sendLockedRef.current = true;
    // The AI desk always reads the exact chart state (drawings, indicators,
    // scripts) as text, so every question answers through the OmniRoute text
    // chain — vision providers are only used for images the user attaches.
    const chartContext = chartRef.current?.describe() || undefined;
    const chartImage = image?.url;
    const pairLabel = asset.length === 6 ? `${asset.slice(0, 3)}/${asset.slice(3)}` : asset;
    addMessage({
      role: "user",
      text: query,
      files: image ? [image] : undefined,
      chartSynced: chartContext ? `${pairLabel} ${tf.label}` : undefined,
    });
    setInput("");
    const history = messagesRef.current
      .filter((m) => m.text.trim().length > 0)
      .slice(-12)
      .map((m) => ({ role: m.role, content: m.text.slice(0, 1200) }));
    try {
      await ask.mutateAsync({ query, chartImage, history, chartContext });
    } finally {
      sendLockedRef.current = false;
    }
  }

  async function startRecording() {
    setVoiceError("");
    if (!navigator.mediaDevices?.getUserMedia) {
      setVoiceError("Voice recording is not supported in this browser.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
      });
      const context = new AudioContext();
      const source = context.createMediaStreamSource(stream);
      const processor = context.createScriptProcessor(4096, 1, 1);
      audioChunksRef.current = [];
      processor.onaudioprocess = (event) =>
        audioChunksRef.current.push(new Float32Array(event.inputBuffer.getChannelData(0)));
      source.connect(processor);
      processor.connect(context.destination);
      audioStreamRef.current = stream;
      audioContextRef.current = context;
      audioSourceRef.current = source;
      audioProcessorRef.current = processor;
      setIsRecording(true);
    } catch {
      setVoiceError("Microphone access is needed to record a voice message.");
    }
  }

  async function stopRecording() {
    const context = audioContextRef.current;
    const stream = audioStreamRef.current;
    setIsRecording(false);
    stream?.getTracks().forEach((track) => track.stop());
    audioProcessorRef.current?.disconnect();
    audioSourceRef.current?.disconnect();
    audioProcessorRef.current = null;
    audioSourceRef.current = null;
    audioStreamRef.current = null;
    if (!context) return;
    const blob = encodeWav(audioChunksRef.current, context.sampleRate);
    audioChunksRef.current = [];
    await context.close();
    audioContextRef.current = null;
    if (blob.size < 2048) {
      setVoiceError("That recording was empty. Please try again.");
      return;
    }
    try {
      await voice.mutateAsync(await blobToDataUrl(blob));
    } catch {
      // The mutation displays the safe error in the composer.
    }
  }

  return (
    <TooltipProvider>
      <div
        className={cn(
          "flex h-full min-h-0 w-full flex-col overflow-hidden text-foreground",
          theme === "dark" ? "dark terminal-dark bg-background" : "bg-background",
        )}
      >
        <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
          {/* Chart */}
          <section
            aria-label="XAU/USD chart"
            className={cn(
              "relative min-h-0 min-w-0 flex-1",
              theme === "dark" && "bg-background",
            )}
          >
            <JenvuChartWorkspace
              ref={chartRef}
              timeframes={TIMEFRAMES}
              timeframe={tf}
              asset={asset}
              onAssetChange={changeAsset}
              theme={theme}
              sidePanelOpen={false}
              rightPanelOpen={false}
              onSidePanelOpenChange={setPanelsOpen}
              onTimeframeChange={(next) => {
                const match = TIMEFRAMES.find((item) => item.key === next.key);
                if (match) setTf(match);
              }}
              railSlot={
                <>
                  <button
                    type="button"
                    onClick={() =>
                      setTheme((t) => {
                        const next = t === "dark" ? "light" : "dark";
                        pickedLookRef.current = next;
                        return next;
                      })
                    }
                    aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
                    title={theme === "dark" ? "Light theme" : "Dark theme"}
                    className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full px-2.5 text-[13px] font-medium text-gc-ink-muted transition-colors hover:bg-gc-console-search hover:text-gc-ink dark:text-muted-foreground dark:hover:bg-accent h-[38px] w-[38px] justify-center px-0"
                  >
                    {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                  </button>
                  {!deskOpen && (
                    <button
                      type="button"
                      onClick={() => setWatchlistOpen((v) => !v)}
                      aria-pressed={watchlistOpen}
                      title={watchlistOpen ? "Hide Seasonal Data & Market Info" : "Show Seasonal Data & Market Info"}
                      aria-label={watchlistOpen ? "Hide Seasonal Data & Market Info" : "Show Seasonal Data & Market Info"}
                      className={cn("hidden h-8 shrink-0 items-center gap-1.5 rounded-full px-2.5 text-[12px] font-normal transition-colors lg:inline-flex", watchlistOpen ? "ask-jenvu-launcher" : "text-gc-ink-muted hover:bg-gc-console-search hover:text-gc-ink dark:text-muted-foreground dark:hover:bg-accent")}
                    >
                      <ListChecks className="h-4 w-4" />
                      <span className="hidden xl:inline">Seasonal Data &amp; Market Info</span>
                    </button>
                  )}
                </>
              }
              rightSlot={
                <>
                  {false && !deskOpen && !watchlistOpen && (
                    <button
                      type="button"
                      onClick={() => setWatchlistOpen(true)}
                      className="hidden h-7 items-center gap-1.5 rounded-md px-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground lg:flex"
                      title="Show watchlist"
                      aria-label="Show watchlist"
                    >
                      <ListChecks className="h-4 w-4" />
                      Watchlist
                    </button>
                  )}
                </>
              }
            />
          </section>

          {/* Watchlist (desktop) — replaced by the AI desk while it is open */}
          {showWatchlist && (
            <TerminalWatchlist
              className="hidden lg:flex"
              asset={asset}
              onAssetChange={changeAsset}
              news={nextGoldNews}
              upcomingNews={relevantNews.slice(0, MAX_NEWS)}
              newsLoading={newsQuery.isPending}
              newsFailed={newsQuery.isError && !newsQuery.data}
              onClose={() => setWatchlistOpen(false)}
            />
          )}

          {/* AI desk (opened from the header Ask Jenvu button) */}
          {deskOpen && (
            <aside
              style={deskDrag.x || deskDrag.y ? ({ "--dx": `${deskDrag.x}px`, "--dy": `${deskDrag.y}px` } as React.CSSProperties) : undefined}
              className={cn(
                "lg:[transform:translate(var(--dx,0px),var(--dy,0px))]",
                "ask-jenvu-root fixed inset-x-2 bottom-2 z-40 flex h-[min(480px,calc(100dvh-5rem))] min-h-0 flex-col overflow-hidden rounded-2xl bg-[var(--ask-bg)] text-gc-ink shadow-xl ring-1 ring-gc-line sm:inset-x-auto sm:bottom-4 sm:right-4 sm:h-[min(560px,calc(100dvh-6rem))] sm:w-[min(640px,calc(100vw-2rem))]",
              )}
            >
              <div
                className="flex h-12 shrink-0 items-center justify-end gap-1 px-4 sm:h-14 sm:px-5 lg:cursor-grab lg:select-none lg:active:cursor-grabbing"
                onPointerDown={(e) => {
                  if ((e.target as HTMLElement).closest("button") || window.innerWidth < 1024) return;
                  const sx = e.clientX - deskDrag.x;
                  const sy = e.clientY - deskDrag.y;
                  const move = (ev: PointerEvent) => {
                    const maxX = 24;
                    const panel = e.currentTarget.parentElement;
                    const minX = -(window.innerWidth - (panel?.offsetWidth ?? 640) - 16);
                    const maxY = 24;
                    const minY = -Math.max(0, window.innerHeight - (panel?.offsetHeight ?? 560) - 16);
                    setDeskDrag({
                      x: Math.min(maxX, Math.max(minX, ev.clientX - sx)),
                      y: Math.min(maxY, Math.max(minY, ev.clientY - sy)),
                    });
                  };
                  const up = () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); };
                  window.addEventListener("pointermove", move);
                  window.addEventListener("pointerup", up);
                }}
                title="Drag to move"
              >
                <h2 className="mr-auto text-[15px] font-normal sm:text-[16px]">Ask Jenvu</h2>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-full text-muted-foreground"
                  onClick={() => setHistoryOpen((open) => !open)}
                  title="View past chats"
                  aria-label="Chat history"
                >
                  <History className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-full text-muted-foreground"
                  onClick={startNewChat}
                  title="Start a new chat"
                  aria-label="Start a new chat"
                >
                  <SquarePen className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-full text-muted-foreground"
                  onClick={() => setDeskOpen(false)}
                  title="Hide AI Desk"
                  aria-label="Hide AI Desk"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>

              {historyOpen && (
                <div className="absolute inset-0 z-30 flex flex-col bg-card">
                  <div className="flex min-h-17 items-center border-b-4 border-terminal-line dark:border-border px-4">
                    <History className="mr-2 h-4 w-4" />
                    <h2 className="text-sm font-medium">Past chats</h2>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="ml-auto h-8 w-8"
                      onClick={() => setHistoryOpen(false)}
                      aria-label="Close chat history"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex-1 space-y-1.5 overflow-y-auto p-3">
                    {threads.length === 0 ? (
                      <p className="px-3 py-10 text-center text-sm text-muted-foreground">
                        No past chats yet.
                      </p>
                    ) : (
                      threads.map((thread) => (
                        <div
                          key={thread.id}
                          className={cn(
                            "flex items-center rounded-md border border-border px-2 py-2",
                            thread.id === activeThreadId && "bg-secondary",
                          )}
                        >
                          <button
                            type="button"
                            className="flex min-w-0 flex-1 items-center gap-2 rounded-md px-1 py-1 text-left"
                            onClick={() => loadThread(thread)}
                          >
                            <span className="min-w-0 flex-1 truncate text-left text-sm leading-5">
                              {thread.title}
                            </span>
                            <span className="shrink-0 text-[10px] leading-5 text-muted-foreground">
                              {new Date(thread.updatedAt).toLocaleDateString("en-US", {
                                day: "numeric",
                                month: "short",
                              })}
                            </span>
                          </button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                            onClick={() => deleteThread(thread.id)}
                            aria-label={`Delete ${thread.title}`}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              <Conversation className="min-h-0 flex-1">
                <ConversationContent className="gap-5 px-4 py-5">
                  {messages.length === 0 && (
                    <div className="flex min-h-[260px] flex-col justify-center py-4 sm:min-h-[330px]">
                      <h2 className="mx-auto max-w-[460px] text-center text-[20px] font-normal leading-[1.3] tracking-normal sm:text-[26px]">What would you like to know about?</h2>
                      <div className="mt-4 space-y-2 sm:mt-6 sm:space-y-2.5">
                        {QUICK.map((q) => (
                          <Button type="button" variant="ghost" key={q} onClick={() => void send({ text: q })} className="h-auto w-full justify-between gap-3 whitespace-normal rounded-full bg-gc-surface px-4 py-2.5 text-left text-[13px] font-normal hover:bg-gc-blue-soft sm:px-6 sm:py-4 sm:text-[14px]">
                            <span>{q}</span><CornerDownRight className="h-5 w-5 shrink-0" />
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}

                  {messages.map((m, i) => (
                    <Message key={`${m.role}-${i}`} from={m.role}>
                      <MessageContent
                        className={cn(
                          "text-[15px] leading-7",
                          m.role === "user" &&
                            "rounded-2xl bg-gc-notice px-4 py-2.5 text-gc-ink",
                        )}
                      >
                        {m.signal &&
                          (m.signal.direction === "BUY" || m.signal.direction === "SELL") && (
                            <div className="mb-2 flex flex-wrap gap-1.5 text-[10px] font-semibold">
                              <span className="rounded bg-secondary px-2 py-0.5">
                                {m.signal.direction}
                              </span>
                              <span className="rounded bg-secondary px-2 py-0.5">
                                Entry {m.signal.entry}
                              </span>
                              <span className="rounded bg-secondary px-2 py-0.5">
                                SL {m.signal.stopLoss}
                              </span>
                              {m.signal.takeProfits?.[0] && (
                                <span className="rounded bg-secondary px-2 py-0.5">
                                  TP {m.signal.takeProfits[0]}
                                </span>
                              )}
                            </div>
                          )}
                        {m.files && m.files.length > 0 && (
                          <Attachments variant="grid" className="mb-1 ml-0">
                            {m.files.map((file, fileIndex) => (
                              <Attachment
                                data={{ ...file, id: `${i}-${fileIndex}` }}
                                key={`${i}-${fileIndex}`}
                              >
                                <AttachmentPreview />
                              </Attachment>
                            ))}
                          </Attachments>
                        )}
                        {m.role === "assistant" ? (
                          <MessageResponse>{m.text}</MessageResponse>
                        ) : (
                          m.text
                        )}
                      </MessageContent>
                      {m.role === "user" && m.chartSynced && (
                        <span className="ml-auto inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
                          <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-chart-2" />
                          Live chart synced · {m.chartSynced}
                        </span>
                      )}
                    </Message>
                  ))}

                  {ask.isPending && (
                    <div className="flex items-center gap-2.5 text-sm">
                      <JenvuMark className="h-5 w-5 shrink-0 animate-pulse" />
                      <Shimmer>{loadingLabel}</Shimmer>
                    </div>
                  )}
                </ConversationContent>
                <ConversationScrollButton className="bottom-2 h-8 w-8" />
              </Conversation>

              <div className="mt-auto shrink-0 px-3 pb-2 sm:px-5 sm:pb-3">
                {(voiceError || isRecording || voice.isPending) && (
                  <p
                    className={cn(
                      "mb-2 px-1 text-xs",
                      voiceError ? "text-destructive" : "text-muted-foreground",
                    )}
                    role={voiceError ? "alert" : "status"}
                  >
                    {voiceError ||
                      (isRecording
                        ? "Listening… tap stop when you are finished."
                        : "Transcribing your voice message…")}
                  </p>
                )}
                <PromptInput
                  accept="image/png,image/jpeg,image/webp"
                  maxFiles={1}
                  maxFileSize={MAX_IMAGE_BYTES}
                  onError={(error) =>
                    setVoiceError(
                      error.code === "max_file_size"
                        ? "Chart images must be under 3 MB."
                        : "Attach one PNG, JPEG, or WebP chart image.",
                    )
                  }
                  onSubmit={(message) => send(message)}
                  className="rounded-[24px] border-gc-line bg-background shadow-sm"
                >
                  <ComposerAttachments />
                  <PromptInputTextarea
                    ref={textareaRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={messages.length === 0 ? "Ask a question" : "Ask a follow-up"}
                    className="min-h-14 max-h-32 px-3 pt-3 text-sm"
                  />
                  <PromptInputFooter className="px-2 pb-2">
                    <PromptInputTools>
                      <PromptInputActionMenu>
                        <PromptInputActionMenuTrigger
                          aria-label="Attach chart image"
                          tooltip="Attach chart image"
                        >
                          <ImagePlus className="size-4" />
                        </PromptInputActionMenuTrigger>
                        <PromptInputActionMenuContent>
                          <PromptInputActionAddAttachments label="Upload chart image" />
                        </PromptInputActionMenuContent>
                      </PromptInputActionMenu>
                      <PromptInputButton
                        aria-label={isRecording ? "Stop recording" : "Record voice message"}
                        tooltip={isRecording ? "Stop recording" : "Record voice message"}
                        disabled={voice.isPending}
                        onClick={() => void (isRecording ? stopRecording() : startRecording())}
                        className={cn(
                          isRecording &&
                            "bg-destructive text-destructive-foreground hover:bg-destructive/90",
                        )}
                      >
                        {isRecording ? (
                          <Square className="size-3 fill-current" />
                        ) : (
                          <Mic className="size-4" />
                        )}
                      </PromptInputButton>

                    </PromptInputTools>
                    <PromptInputSubmit
                      status={ask.isPending ? "submitted" : "ready"}
                      disabled={ask.isPending || voice.isPending || isRecording}
                      className="h-8 w-8 rounded-full"
                    />
                  </PromptInputFooter>
                </PromptInput>
                <p className="mt-2 text-center text-[11px] text-gc-ink-muted sm:text-[12px]">Built with Jenvu AI</p>
              </div>
            </aside>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}
