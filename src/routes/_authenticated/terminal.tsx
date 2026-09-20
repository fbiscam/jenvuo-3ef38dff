import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import {
  ImagePlus,
  LineChart,
  Mic,
  Moon,
  PanelRightClose,
  PanelRightOpen,
  Square,
  SquarePen,
  Sun,
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

export const Route = createFileRoute("/_authenticated/terminal")({
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

const QUICK = [
  "Analyse the current chart",
  "Where is liquidity sitting?",
  "Is there a valid setup right now?",
];

const MAX_IMAGE_BYTES = 3 * 1024 * 1024;

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
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [deskOpen, setDeskOpen] = useState(true);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [voiceError, setVoiceError] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const audioSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const audioProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const audioChunksRef = useRef<Float32Array[]>([]);
  const analyze = useServerFn(analyzeGold);
  const transcribe = useServerFn(transcribeVoiceMessage);

  const chartSrc = useMemo(() => {
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
      details: "1",
      studies: JSON.stringify(["STD;EMA", "STD;RSI"]),
    });
    return `https://s.tradingview.com/widgetembed/?${params.toString()}`;
  }, [tf.tv, theme]);

  const ask = useMutation({
    mutationFn: async ({ query, chartImage }: { query: string; chartImage?: string }) =>
      analyze({ data: { timeframe: tf.key, query, chartImage } }),
    onSuccess: (signal) => {
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          text: signal.fullAnalysis || signal.spokenSummary || "No read available.",
          signal,
        },
      ]);
    },
    onError: (err: unknown) => {
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          text:
            err instanceof Error && err.message.includes("INSUFFICIENT_CREDITS")
              ? "You are out of balance for a new read. Top up and try again."
              : "The desk could not answer just now. Please try again in a moment.",
        },
      ]);
    },
  });

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
    setMessages((m) => [...m, { role: "user", text: query, files: image ? [image] : undefined }]);
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
      <div className="fixed inset-0 z-40 flex w-full flex-col overflow-hidden bg-background">
      {/* Top toolbar */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2">
        <div className="flex items-center gap-2 pr-3 font-semibold">
          <LineChart className="h-4 w-4 text-primary" />
          <span>{SYMBOL.label}</span>
        </div>
        <div className="flex items-center gap-1 rounded-md border border-border p-0.5">
          {TIMEFRAMES.map((t) => (
            <Button
              key={t.key}
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setTf(t)}
              className={cn(
                "h-7 rounded px-2 text-xs shadow-none",
                t.key === tf.key
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted",
              )}
            >
              {t.label}
            </Button>
          ))}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="ml-auto h-7 gap-1.5 px-2 text-xs text-muted-foreground shadow-none"
        >
          {theme === "dark" ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
          {theme === "dark" ? "Light" : "Dark"}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setDeskOpen((v) => !v)}
          className="h-7 gap-1.5 px-2 text-xs text-muted-foreground shadow-none"
          aria-pressed={deskOpen}
        >
          {deskOpen ? (
            <PanelRightClose className="h-3.5 w-3.5" />
          ) : (
            <PanelRightOpen className="h-3.5 w-3.5" />
          )}
          {deskOpen ? "Hide AI Desk" : "Show AI Desk"}
        </Button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        {/* Chart */}
        <main className="min-h-0 flex-1">
          <iframe
            key={chartSrc}
            src={chartSrc}
            title={`${SYMBOL.label} ${tf.label} chart`}
            className="h-full w-full border-0"
            allowFullScreen
          />
        </main>

        {/* AI desk */}
        {deskOpen && (
          <aside className="flex h-[45%] w-full shrink-0 flex-col border-t border-border bg-card text-card-foreground lg:h-auto lg:w-96 lg:border-l lg:border-t-0">
            <div className="flex min-h-17 items-center gap-2.5 border-b border-border px-4 py-3">
              <img src={jenvuLogo} alt="Jenvu" className="h-9 w-9 shrink-0 object-contain" />
              <div className="min-w-0">
                <div className="flex items-center gap-1">
                  <span className="text-lg font-medium leading-none">Jenvu</span>
                  <img
                    src={jenvuTick}
                    alt="Verified"
                    className="h-4.5 w-4.5 shrink-0 object-contain"
                  />
                </div>
                <p className="mt-1 text-[10px] font-medium text-muted-foreground">
                  Gold 30-minute analysis ready
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="ml-auto h-8 w-8 rounded-full text-muted-foreground"
                onClick={() => setMessages([])}
                title="Start a new chat"
                aria-label="Start a new chat"
              >
                <SquarePen className="h-4 w-4" />
              </Button>
            </div>

            <Conversation className="min-h-0">
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
                          className="h-auto rounded-full px-2.5 py-1.5 text-[11px] font-normal text-muted-foreground shadow-none hover:text-primary"
                        >
                          {q}
                        </Button>
                      ))}
                    </div>
                    <p className="ml-8 text-[10px] font-medium uppercase text-muted-foreground">
                      {tf.label} · {SYMBOL.label}
                    </p>
                  </div>
                )}

                {messages.map((m, i) => (
                  <Message key={`${m.role}-${i}`} from={m.role}>
                    <MessageContent
                      className={cn(
                        "text-[13px] leading-6",
                        m.role === "user" &&
                          "rounded-2xl bg-secondary px-3.5 py-2.5 text-secondary-foreground",
                      )}
                    >
                      {m.signal && (
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
                    <Shimmer>{`Reading the ${tf.label} gold chart…`}</Shimmer>
                  </div>
                )}
              </ConversationContent>
              <ConversationScrollButton className="bottom-2 h-8 w-8" />
            </Conversation>

            <div className="bg-card px-3.5 pb-3 pt-2">
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
                    <span className="pl-1 text-[11px] text-muted-foreground">Jenvu AI</span>
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
