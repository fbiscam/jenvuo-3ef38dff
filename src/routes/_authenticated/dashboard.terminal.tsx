import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import {
  History,
  ImagePlus,
  Mic,
  PanelRightClose,
  Square,
  SquarePen,
  Timer,
  Trash2,
  X,
} from "lucide-react";
import type { FileUIPart } from "ai";
import { analyzeGold, type GoldSignal } from "@/lib/gold-analysis.functions";
import { transcribeVoiceMessage } from "@/lib/transcription.functions";
import { cn } from "@/lib/utils";
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
import jenvuLogo from "@/assets/jenvu-logo.png";
import jenvuTick from "@/assets/jenvu-tick.png";

export const Route = createFileRoute("/_authenticated/dashboard/terminal")({
  head: () => ({
    meta: [
      { title: "Jenvu Terminal — Live XAU/USD Chart & AI Desk" },
      {
        name: "description",
        content:
          "Full-screen gold charting terminal with drawing tools, multiple timeframes and a built-in AI desk that reads the chart with you.",
      },
      { property: "og:title", content: "Jenvu Terminal — Live XAU/USD Chart & AI Desk" },
      {
        property: "og:description",
        content: "Chart gold like a pro and ask the Jenvu AI desk about the setup in one screen.",
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
  { key: "5m", tv: "5", label: "5m" },
  { key: "15m", tv: "15", label: "15m" },
  { key: "30m", tv: "30", label: "30m" },
  { key: "1h", tv: "60", label: "1H" },
  { key: "4h", tv: "240", label: "4H" },
  { key: "1d", tv: "D", label: "1D" },
];

const SYMBOL = { key: "XAUUSD", tv: "OANDA:XAUUSD", label: "XAU/USD" };

type ChatMsg = {
  role: "user" | "assistant";
  text: string;
  signal?: GoldSignal;
  files?: FileUIPart[];
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
  if (tvInterval === "D") {
    const next = Date.UTC(
      new Date(now).getUTCFullYear(),
      new Date(now).getUTCMonth(),
      new Date(now).getUTCDate() + 1,
    );
    return Math.max(0, Math.floor((next - now) / 1000));
  }
  const minutes = Number(tvInterval);
  if (!Number.isFinite(minutes) || minutes <= 0) return 0;
  const period = minutes * 60_000;
  return Math.max(0, Math.ceil((period - (now % period)) / 1000));
}

function formatCountdown(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (value: number) => String(value).padStart(2, "0");
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${pad(minutes)}:${pad(seconds)}`;
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
    /\b(gold|xau|chart|trade|trading|setup|signal|entry|buy|sell|long|short|analysis|analyze|bias|price|trend|level|zone|liquidity|fvg|order\s*block|bos|choch|smc|ict|killzone|scalp|swing)\b/i.test(
      query,
    );
  return tradingQuery ? "Reviewing gold structure…" : "Preparing your answer…";
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
  const theme = "light" as const;
  const [deskOpen, setDeskOpen] = useState(false);
  const [chartUserId, setChartUserId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [voiceError, setVoiceError] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const audioSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const audioProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const audioChunksRef = useRef<Float32Array[]>([]);
  const hydratedRef = useRef(false);
  const activeThreadIdRef = useRef<string | null>(null);
  const analyze = useServerFn(analyzeGold);
  const transcribe = useServerFn(transcribeVoiceMessage);

  function addMessage(message: ChatMsg) {
    setMessages((current) => [...current, message]);
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
    setMessages([]);
    setHistoryOpen(false);
    requestAnimationFrame(() => textareaRef.current?.focus());
  }

  function loadThread(thread: ChatThread) {
    activeThreadIdRef.current = thread.id;
    setActiveThreadId(thread.id);
    setMessages(thread.messages);
    setHistoryOpen(false);
  }

  function deleteThread(id: string) {
    setThreads((current) => current.filter((thread) => thread.id !== id));
    if (activeThreadIdRef.current === id) startNewChat();
  }

  const chartSrc = useMemo(() => {
    if (!chartUserId) return null;
    const params = new URLSearchParams({
      symbol: SYMBOL.tv,
      interval: tf.tv,
      timezone: "Etc/UTC",
      theme,
      style: "1",
      locale: "en",
      hide_top_toolbar: "0",
      hide_legend: "0",
      hide_side_toolbar: "0",
      allow_symbol_change: "0",
      withdateranges: "1",
      details: "0",
      save_chart_properties_to_local_storage: "1",
      saveimage: "1",
      client_id: "jenvu.com",
      user_id: chartUserId,
      studies: JSON.stringify(["STD;EMA", "STD;RSI"]),
      enabled_features: JSON.stringify([
        "countdown",
        "save_chart_properties_to_local_storage",
        "use_localstorage_for_settings",
      ]),
      disabled_features: JSON.stringify([]),
    });
    return `https://s.tradingview.com/widgetembed/?${params.toString()}`;
  }, [tf.tv, chartUserId]);

  const ask = useMutation({
    mutationFn: async ({ query, chartImage }: { query: string; chartImage?: string }) =>
      analyze({ data: { timeframe: tf.key, query, chartImage, advisor: true } }),
    onSuccess: (signal) => {
      addMessage({
        role: "assistant",
        text: signal.fullAnalysis || signal.spokenSummary || "No read available.",
        signal,
      });
    },
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : "";
      addMessage({
        role: "assistant",
        text: /INSUFFICIENT_CREDITS|Low balance/i.test(message)
          ? "You are out of balance. Top up and try again."
          : /Daily token limit/i.test(message)
            ? message
            : /not included|Upgrade to/i.test(message)
              ? message
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
      setMessages(savedThreads.find((thread) => thread.id === savedActiveId)?.messages ?? []);

      const settings = JSON.parse(window.localStorage.getItem(TERMINAL_SETTINGS_KEY) || "null") as {
        timeframe?: string;
        theme?: "light" | "dark";
        deskOpen?: boolean;
      } | null;
      const savedTimeframe = TIMEFRAMES.find((timeframe) => timeframe.key === settings?.timeframe);
      if (savedTimeframe) setTf(savedTimeframe);
      // The AI desk always starts closed so the chart opens exactly as left.

      const CHART_USER_KEY = "jenvu:terminal:chart-user:v1";
      let chartUser = window.localStorage.getItem(CHART_USER_KEY);
      if (!chartUser) {
        chartUser = `jenvu-${Math.random().toString(36).slice(2, 12)}`;
        window.localStorage.setItem(CHART_USER_KEY, chartUser);
      }
      setChartUserId(chartUser);
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
      JSON.stringify({ timeframe: tf.key, deskOpen }),
    );
  }, [tf.key, deskOpen]);

  useEffect(() => {
    setSecondsLeft(candleSecondsLeft(tf.tv));
    const timer = window.setInterval(() => setSecondsLeft(candleSecondsLeft(tf.tv)), 1000);
    return () => window.clearInterval(timer);
  }, [tf.tv]);

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
    const query = message.text.trim() || (image ? "Analyze this XAU/USD chart screenshot." : "");
    if (!query || ask.isPending) return;
    addMessage({ role: "user", text: query, files: image ? [image] : undefined });
    setInput("");
    await ask.mutateAsync({ query, chartImage: image?.url });
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
      <div className="flex h-full min-h-0 w-full flex-col overflow-hidden bg-background">
        <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
          {/* Chart */}
          <main className="relative min-h-0 flex-1 bg-background">
            <div className="absolute right-28 top-1.5 z-10 flex items-center gap-2">
              <select
                value={tf.key}
                onChange={(event) => {
                  const next = TIMEFRAMES.find((item) => item.key === event.target.value);
                  if (next) setTf(next);
                }}
                aria-label="Chart timeframe"
                title="Timeframe used by the timer and the AI desk"
                className="h-7 rounded-md bg-white px-1.5 text-xs font-semibold text-foreground outline-none"
              >
                {TIMEFRAMES.map((item) => (
                  <option key={item.key} value={item.key}>
                    {item.label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setDeskOpen(true)}
                className="flex h-7 items-center gap-1.5 rounded-md px-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                title="Ask With AI"
                aria-label="Ask With AI"
              >
                <img src={jenvuLogo} alt="" className="h-4 w-4 shrink-0 object-contain" />
                Ask With AI
              </button>
              <div
                className="flex h-7 items-center gap-1.5 rounded-md bg-white px-2 font-mono text-xs font-semibold text-foreground"
                title={`Time left on the current ${tf.label} candle`}
                aria-label={`Current ${tf.label} candle closes in ${formatCountdown(secondsLeft)}`}
              >
                <Timer className="h-3.5 w-3.5 text-muted-foreground" />
                {formatCountdown(secondsLeft)}
              </div>
            </div>
            {chartSrc ? (
              <iframe
                src={chartSrc}
                title={`${SYMBOL.label} ${tf.label} chart`}
                className="h-full w-full border-0"
                allowFullScreen
              />
            ) : (
              <div className="h-full w-full bg-background" aria-label="Loading chart" />
            )}
          </main>

          {/* AI desk */}
          {deskOpen && (
            <aside className="relative flex h-[45%] min-h-0 w-full shrink-0 flex-col border-t border-border bg-card text-card-foreground lg:h-full lg:w-[380px] lg:border-l lg:border-t-0">
              <div className="flex min-h-17 items-center gap-2.5 border-b border-border px-4 py-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-1">
                    <h2 className="truncate text-sm font-semibold">Jenvu</h2>
                    <img src={jenvuTick} alt="Verified" className="size-3.5 shrink-0" />
                  </div>
                  <p className="truncate text-[11px] text-muted-foreground">
                    Gold {tf.label} analysis ready
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="ml-auto h-8 w-8 rounded-full text-muted-foreground"
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
                  <PanelRightClose className="h-4 w-4" />
                </Button>
              </div>

              {historyOpen && (
                <div className="absolute inset-0 z-30 flex flex-col bg-card">
                  <div className="flex min-h-17 items-center border-b border-border px-4">
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
                    <div className="space-y-4">
                      <div className="flex gap-2.5 text-sm leading-6">
                        <img
                          src={jenvuLogo}
                          alt=""
                          className="mt-0.5 h-6 w-6 shrink-0 object-contain"
                        />
                        <p>
                          Ask about the chart you are looking at. I use live gold data for the
                          selected timeframe.
                        </p>
                      </div>
                      <div className="ml-8 flex flex-wrap gap-1.5">
                        {QUICK.map((q) => (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            key={q}
                            onClick={() => void send({ text: q })}
                            className="h-auto rounded-full px-3.5 py-2 text-[14px] font-normal text-muted-foreground shadow-none hover:text-primary"
                          >
                            {q}
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
                            "rounded-2xl bg-secondary px-3.5 py-2.5 text-secondary-foreground",
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
                    </Message>
                  ))}

                  {ask.isPending && (
                    <div className="flex items-center gap-2.5 text-sm">
                      <img src={jenvuLogo} alt="" className="h-6 w-6 shrink-0 object-contain" />
                      <Shimmer>{loadingLabel}</Shimmer>
                    </div>
                  )}
                </ConversationContent>
                <ConversationScrollButton className="bottom-2 h-8 w-8" />
              </Conversation>

              <div className="mt-auto shrink-0 border-t border-border bg-card px-3.5 pb-3 pt-2">
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
                  className="rounded-[18px] border-border bg-card shadow-sm transition-shadow focus-within:shadow-md"
                >
                  <ComposerAttachments />
                  <PromptInputTextarea
                    ref={textareaRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="How can I help you today?"
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
                      <span className="flex items-center gap-1.5 pl-1 text-[11px] text-muted-foreground">
                        <svg
                          viewBox="0 0 24 24"
                          aria-hidden="true"
                          className="size-3.5 shrink-0"
                          fill="#D97757"
                        >
                          <path d="m4.7144 15.9555 4.7174-2.6471.079-.2307-.079-.1275h-.2307l-.7893-.0486-2.6956-.0729-2.3375-.0971-2.2646-.1214-.5707-.1215-.5343-.7042.0546-.3522.4797-.3218.686.0608 1.5179.1032 2.2767.1578 1.6514.0972 2.4468.255h.3886l.0546-.1579-.1336-.0971-.1032-.0972L6.973 9.8356l-2.55-1.6879-1.3356-.9714-.7225-.4918-.3643-.4614-.1578-1.0078.6557-.7225.8803.0607.2246.0607.8925.686 1.9064 1.4754 2.4893 1.8336.3643.3035.1457-.1032.0182-.0728-.164-.2733-1.3539-2.4467-1.445-2.4893-.6435-1.032-.17-.6194c-.0607-.255-.1032-.4674-.1032-.7285L6.287.1335 6.6997 0l.9957.1336.419.3642.6192 1.4147 1.0018 2.2282 1.5543 3.0296.4553.8985.2429.8318.091.255h.1579v-.1457l.1275-1.706.2368-2.0947.2307-2.6957.0789-.7589.3764-.9107.7468-.4918.5828.2793.4797.686-.0668.4433-.2853 1.8517-.5586 2.9021-.3643 1.9429h.2125l.2429-.2429.9835-1.3053 1.6514-2.0643.7286-.8196.85-.9046.5464-.4311h1.0321l.759 1.1293-.34 1.1657-1.0625 1.3478-.8804 1.1414-1.2628 1.7-.7893 1.36.0729.1093.1882-.0183 2.8535-.607 1.5421-.2794 1.8396-.3157.8318.3886.091.3946-.3278.8075-1.967.4857-2.3072.4614-3.4364.8136-.0425.0304.0486.0607 1.5482.1457.6618.0364h1.621l3.0175.2247.7892.522.4736.6376-.079.4857-1.2142.6193-1.6393-.3886-3.825-.9107-1.3113-.3279h-.1822v.1093l1.0929 1.0686 2.0035 1.8092 2.5075 2.3314.1275.5768-.3218.4554-.34-.0486-2.2039-1.6575-.85-.7468-1.9246-1.621h-.1275v.17l.4432.6496 2.3436 3.5214.1214 1.0807-.17.3521-.6071.2125-.6679-.1214-1.3721-1.9246L14.38 17.959l-1.1414-1.9428-.1397.079-.674 7.2552-.3156.3703-.7286.2793-.6071-.4614-.3218-.7468.3218-1.4753.3886-1.9246.3157-1.53.2853-1.9004.17-.6314-.0121-.0425-.1397.0182-1.4328 1.9672-2.1796 2.9446-1.7243 1.8456-.4128.164-.7164-.3704.0667-.6618.4008-.5889 2.386-3.0357 1.4389-1.882.929-1.0868-.0062-.1579h-.0546l-6.3385 4.1164-1.1293.1457-.4857-.4554.0608-.7467.2307-.2429 1.9064-1.3114Z" />
                        </svg>
                        Claude Sonnet 4.5
                      </span>
                    </PromptInputTools>
                    <PromptInputSubmit
                      status={ask.isPending ? "submitted" : "ready"}
                      disabled={ask.isPending || voice.isPending || isRecording}
                      className="h-8 w-8 rounded-full"
                    />
                  </PromptInputFooter>
                </PromptInput>
              </div>
            </aside>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}
