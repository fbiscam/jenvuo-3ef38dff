import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { MainSidebar } from "@/components/MainSidebar";
import {
  ArrowUp,
  Check,
  ChevronDown,
  Copy,
  Image as ImageIcon,
  Menu,
  MonitorUp,
  PanelLeftClose,
  PanelLeftOpen,
  Pencil,
  Plus,
  RotateCcw,
  Trash2,
  X,
} from "lucide-react";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
  Message,
  MessageAction,
  MessageActions,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputButton,
  PromptInputFooter,
  PromptInputSelect,
  PromptInputSelectContent,
  PromptInputSelectItem,
  PromptInputSelectTrigger,
  PromptInputSelectValue,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
} from "@/components/ai-elements/prompt-input";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuthUser } from "@/hooks/useAuthUser";
import { cn } from "@/lib/utils";
import {
  ASSISTANT_MODELS,
  sendAssistantMessage,
  type AssistantModelChoice,
} from "@/lib/chat-assistant.functions";

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  model?: string;
  image?: string;
};
export type ChatThread = { id: string; title: string; updatedAt: number; messages: ChatMessage[] };

const STORE_KEY = "jenvu.chat.threads.v1";

export function loadThreads(): ChatThread[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORE_KEY);
    const parsed = raw ? (JSON.parse(raw) as ChatThread[]) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveThreads(threads: ChatThread[]) {
  try {
    window.localStorage.setItem(STORE_KEY, JSON.stringify(threads.slice(0, 50)));
  } catch {
    // Browser storage can be unavailable or full.
  }
}

export function newThreadId() {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);
}

async function captureScreenFrame(): Promise<string> {
  const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
  try {
    const video = document.createElement("video");
    video.srcObject = stream;
    video.muted = true;
    await video.play();
    await new Promise((resolve) => setTimeout(resolve, 400));
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Screen capture is not supported in this browser.");
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.82);
  } finally {
    stream.getTracks().forEach((track) => track.stop());
  }
}

function formatThreadTime(timestamp: number) {
  const delta = Date.now() - timestamp;
  if (delta < 86_400_000) return "Today";
  if (delta < 172_800_000) return "Yesterday";
  return "Previous 7 days";
}

export function ChatWorkspace({ threadId }: { threadId: string }) {
  const navigate = useNavigate();
  const send = useServerFn(sendAssistantMessage);
  const { user } = useAuthUser();
  const [threads, setThreads] = useState<ChatThread[]>(() => loadThreads());
  const [input, setInput] = useState("");
  const [model, setModel] = useState<AssistantModelChoice>("auto");
  const [image, setImage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const thread = useMemo(
    () =>
      threads.find((item) => item.id === threadId) ?? {
        id: threadId,
        title: "New chat",
        updatedAt: Date.now(),
        messages: [],
      },
    [threads, threadId],
  );

  const update = useCallback(
    (updater: (current: ChatThread) => ChatThread) => {
      setThreads((previous) => {
        const existing = previous.find((item) => item.id === threadId);
        const base = existing ?? {
          id: threadId,
          title: "New chat",
          updatedAt: Date.now(),
          messages: [],
        };
        const next = updater(base);
        const merged = [next, ...previous.filter((item) => item.id !== threadId)].sort(
          (a, b) => b.updatedAt - a.updatedAt,
        );
        saveThreads(merged);
        return merged;
      });
    },
    [threadId],
  );

  useEffect(() => {
    textareaRef.current?.focus();
    setSidebarOpen(false);
  }, [threadId]);

  async function onSubmit() {
    const text = input.trim();
    if (!text || busy) return;
    const attached = image;
    const userMessage: ChatMessage = {
      id: newThreadId(),
      role: "user",
      text,
      image: attached ?? undefined,
    };
    const history = [...thread.messages, userMessage];
    update((current) => ({
      ...current,
      title: current.messages.length === 0 ? text.slice(0, 48) : current.title,
      updatedAt: Date.now(),
      messages: history,
    }));
    setInput("");
    setImage(null);
    setBusy(true);
    try {
      const response = await send({
        data: {
          messages: history.map((message) => ({ role: message.role, text: message.text })),
          model,
          image: attached,
        },
      });
      update((current) => ({
        ...current,
        updatedAt: Date.now(),
        messages: [
          ...current.messages,
          { id: newThreadId(), role: "assistant", text: response.text, model: response.model },
        ],
      }));
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Jenvu could not answer. Please try again.",
      );
    } finally {
      setBusy(false);
      textareaRef.current?.focus();
    }
  }

  function startNewChat() {
    void navigate({ to: "/chat/$threadId", params: { threadId: newThreadId() } });
  }

  function removeThread(id: string) {
    setThreads((previous) => {
      const next = previous.filter((item) => item.id !== id);
      saveThreads(next);
      return next;
    });
    if (id === threadId) startNewChat();
  }

  async function onPickFile(file: File | null) {
    if (!file) return;
    if (file.size > 3_000_000) {
      toast.error("Image must be under 3 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setImage(String(reader.result || "") || null);
    reader.readAsDataURL(file);
  }

  const userName = String(
    user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Account",
  );
  const initial = userName.slice(0, 1).toUpperCase();
  const groupedThreads = threads.reduce<Record<string, ChatThread[]>>((groups, item) => {
    const label = formatThreadTime(item.updatedAt);
    groups[label] = [...(groups[label] ?? []), item];
    return groups;
  }, {});

  const composer = (
    <PromptInput
      accept="image/png,image/jpeg,image/webp"
      maxFiles={1}
      maxFileSize={3_000_000}
      onError={({ message }) => toast.error(message)}
      onSubmit={() => onSubmit()}
      className="rounded-[26px] border-border bg-background shadow-[0_10px_35px_color-mix(in_oklab,var(--foreground)_10%,transparent)]"
    >
      <PromptInputTextarea
        ref={textareaRef}
        value={input}
        onChange={(event) => setInput(event.target.value)}
        placeholder="Ask anything"
        className="min-h-12 px-5 pt-4 text-[15px]"
      />
      <PromptInputFooter className="px-2 pb-2">
        <PromptInputTools>
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={(event) => void onPickFile(event.target.files?.[0] ?? null)}
          />
          <PromptInputButton
            tooltip="Attach chart"
            aria-label="Attach chart"
            onClick={() => fileRef.current?.click()}
          >
            <Plus className="size-5" />
          </PromptInputButton>
          <PromptInputButton
            tooltip="Capture screen"
            aria-label="Capture screen"
            onClick={async () => {
              try {
                setImage(await captureScreenFrame());
                toast.success("Screen captured. Add your question and send.");
              } catch {
                toast.error("Screen sharing was cancelled or is unavailable.");
              }
            }}
          >
            <MonitorUp className="size-4" />
            <span className="hidden sm:inline">Share screen</span>
          </PromptInputButton>
          <PromptInputSelect
            value={model}
            onValueChange={(value) => setModel(value as AssistantModelChoice)}
          >
            <PromptInputSelectTrigger
              className="h-8 w-auto max-w-40 px-2 text-xs"
              aria-label="Choose model"
            >
              <PromptInputSelectValue />
            </PromptInputSelectTrigger>
            <PromptInputSelectContent>
              {ASSISTANT_MODELS.map((option) => (
                <PromptInputSelectItem key={option.id} value={option.id}>
                  {option.label}
                </PromptInputSelectItem>
              ))}
            </PromptInputSelectContent>
          </PromptInputSelect>
        </PromptInputTools>
        <PromptInputSubmit
          status={busy ? "submitted" : "ready"}
          disabled={busy || !input.trim()}
          className="size-9 rounded-full"
        >
          {busy ? undefined : <ArrowUp className="size-4" />}
        </PromptInputSubmit>
      </PromptInputFooter>
    </PromptInput>
  );

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex h-dvh overflow-hidden bg-background text-foreground">
        {sidebarOpen && (
          <Button
            variant="ghost"
            aria-label="Close chat menu"
            className="fixed inset-0 z-30 h-auto w-auto rounded-none bg-foreground/20 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <MainSidebar
          collapsed={sidebarCollapsed}
          onToggleCollapsed={() => setSidebarCollapsed((value) => !value)}
          mobileOpen={sidebarOpen}
          onCloseMobile={() => setSidebarOpen(false)}
        />

        <main className="relative flex min-w-0 flex-1 flex-col bg-background">
          <header className="grid h-16 shrink-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-3 sm:px-5">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open chat menu"
            >
              <Menu />
            </Button>
            <div className="min-w-0">
              {thread.messages.length > 0 && (
                <h1 className="truncate text-sm font-medium">{thread.title}</h1>
              )}
            </div>
            <Button asChild variant="ghost" size="sm" className="text-xs">
              <Link to="/dashboard">Dashboard</Link>
            </Button>
          </header>

          {thread.messages.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center px-4 pb-[16vh]">
              <div className="w-full max-w-3xl">
                <div className="mb-8 text-center">
                  <img
                    src="/favicon.png"
                    alt=""
                    className="mx-auto mb-4 size-11 rounded-xl object-contain"
                  />
                  <h1 className="text-2xl font-normal sm:text-3xl">What can I help with?</h1>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Chat naturally or share an XAU/USD chart for ICT/SMC analysis.
                  </p>
                </div>
                {image && (
                  <div className="mb-3 flex items-center gap-3 rounded-lg border bg-card p-2">
                    <img
                      src={image}
                      alt="Chart attachment preview"
                      className="h-16 w-24 rounded-md object-cover"
                    />
                    <span className="min-w-0 flex-1 text-sm text-muted-foreground">
                      Chart ready to analyze
                    </span>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => setImage(null)}
                      aria-label="Remove attachment"
                    >
                      <X />
                    </Button>
                  </div>
                )}
                {composer}
                <div className="mx-auto mt-7 grid max-w-xl gap-1 text-sm text-muted-foreground">
                  <Button
                    variant="ghost"
                    className="justify-start font-normal"
                    onClick={() =>
                      setInput("Analyze this XAU/USD chart using ICT and SMC concepts")
                    }
                  >
                    <ImageIcon /> Analyze a chart
                  </Button>
                  <Button
                    variant="ghost"
                    className="justify-start font-normal"
                    onClick={() => setInput("Help me write or improve this:")}
                  >
                    <Pencil /> Write or edit
                  </Button>
                  <Button
                    variant="ghost"
                    className="justify-start font-normal"
                    onClick={() => setInput("Explain today’s XAU/USD market structure")}
                  >
                    {" "}
                    <MonitorUp /> Explore gold
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <>
              <Conversation className="min-h-0">
                <ConversationContent className="mx-auto w-full max-w-3xl gap-7 px-4 pb-44 pt-8 sm:px-6">
                  {thread.messages.map((message) => (
                    <Message key={message.id} from={message.role} className="max-w-full">
                      <MessageContent
                        className={cn(
                          message.role === "user" && "rounded-3xl bg-secondary px-4 py-2.5",
                        )}
                      >
                        {message.image && (
                          <img
                            src={message.image}
                            alt="Attached XAU/USD chart"
                            className="mb-2 max-h-72 rounded-lg object-contain"
                          />
                        )}
                        {message.role === "assistant" ? (
                          <MessageResponse>{message.text}</MessageResponse>
                        ) : (
                          <p className="whitespace-pre-wrap">{message.text}</p>
                        )}
                      </MessageContent>
                      {message.role === "assistant" && (
                        <MessageActions>
                          <MessageAction
                            tooltip="Copy"
                            onClick={() => {
                              void navigator.clipboard.writeText(message.text);
                              toast.success("Copied");
                            }}
                          >
                            <Copy />
                          </MessageAction>
                          <MessageAction
                            tooltip="Use again"
                            onClick={() =>
                              setInput(
                                thread.messages.find((item) => item.role === "user")?.text ?? "",
                              )
                            }
                          >
                            <RotateCcw />
                          </MessageAction>
                          {message.model && (
                            <span className="ml-1 text-[11px] text-muted-foreground">
                              {message.model}
                            </span>
                          )}
                        </MessageActions>
                      )}
                    </Message>
                  ))}
                  {busy && (
                    <div className="flex items-center gap-2 text-sm">
                      <img src="/favicon.png" alt="" className="size-6 rounded-md" />
                      <Shimmer>Jenvu is thinking…</Shimmer>
                    </div>
                  )}
                </ConversationContent>
                <ConversationScrollButton />
              </Conversation>
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-background via-background to-transparent px-4 pb-3 pt-12">
                <div className="mx-auto max-w-3xl">
                  {image && (
                    <div className="mb-2 flex items-center gap-3 rounded-lg border bg-card p-2">
                      <img
                        src={image}
                        alt="Chart attachment preview"
                        className="h-14 w-20 rounded-md object-cover"
                      />
                      <span className="min-w-0 flex-1 text-sm text-muted-foreground">
                        Chart ready
                      </span>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => setImage(null)}
                        aria-label="Remove attachment"
                      >
                        <X />
                      </Button>
                    </div>
                  )}
                  {composer}
                  <p className="mt-2 text-center text-[11px] text-muted-foreground">
                    Jenvu can make mistakes. Verify important market information.
                  </p>
                </div>
              </div>
            </>
          )}
        </main>
      </div>
    </TooltipProvider>
  );
}
