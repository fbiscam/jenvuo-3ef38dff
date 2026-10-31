import * as React from "react";
import { useRouterState } from "@tanstack/react-router";
import {
  ArrowLeft, ArrowUp, Copy, CornerDownRight, FileText, Maximize2, MoreVertical,
  RotateCw, SearchCheck, ThumbsDown, ThumbsUp, X, CheckCircle2, Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { MessageResponse } from "@/components/ai-elements/message";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { askJenvu } from "@/lib/ask-jenvu.functions";
import { submitContactMessage } from "@/lib/contact.functions";
import askJenvuMark from "@/assets/ask-jenvu-mark.png";
import { LiveChatPanel } from "@/components/LiveChatWidget";
import { wantsLiveAgent } from "@/lib/live-agent-intent";

type Msg = { role: "user" | "assistant"; content: string; followUps?: string[]; showSales?: boolean; error?: boolean };

const STARTERS = [
  "How can I try Jenvu for free?",
  "What does the Jenvu Terminal show?",
  "Summarize Jenvu plans and pricing",
];

/** Opens the Ask Jenvu panel from anywhere: window.dispatchEvent(new CustomEvent("jenvu:ask", { detail: { view: "sales" } })) */
export function openAskJenvu(view: "chat" | "sales" | "live" = "chat") {
  window.dispatchEvent(new CustomEvent("jenvu:ask", { detail: { view } }));
}

// Floating button shows on every page except the dashboard (which includes the Terminal);
// there it opens from the Ask Jenvu button in the top bar.
const HIDDEN = [/^\/dashboard/];

export function AskJenvuWidget() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = React.useState(false);
  const [view, setView] = React.useState<"chat" | "sales" | "live">("chat");
  const [handoff, setHandoff] = React.useState("");
  const [msgs, setMsgs] = React.useState<Msg[]>([]);
  const [input, setInput] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [compact, setCompact] = React.useState(false);
  const [menu, setMenu] = React.useState(false);
  const inputRef = React.useRef<HTMLTextAreaElement>(null);
  const scrollRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const h = (e: Event) => {
      const v = (e as CustomEvent).detail?.view;
      setView(v === "sales" ? "sales" : v === "live" ? "live" : "chat");
      setOpen(true);
    };
    window.addEventListener("jenvu:ask", h);
    return () => window.removeEventListener("jenvu:ask", h);
  }, []);

  React.useEffect(() => {
    const onScroll = () => setCompact(window.scrollY > 240);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Build the (hidden) panel once the page is idle so opening it is instant.
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => {
    if (open) { setMounted(true); return; }
    const w = window as Window & { requestIdleCallback?: (cb: () => void) => number; cancelIdleCallback?: (id: number) => void };
    if (w.requestIdleCallback) {
      const id = w.requestIdleCallback(() => setMounted(true));
      return () => w.cancelIdleCallback?.(id);
    }
    const id = window.setTimeout(() => setMounted(true), 1500);
    return () => window.clearTimeout(id);
  }, [open]);

  React.useEffect(() => {
    if (!(open && view === "chat" && !busy)) return;
    // Focus after the open animation so it doesn't force a layout mid-frame.
    const id = window.setTimeout(() => inputRef.current?.focus({ preventScroll: true }), 220);
    return () => window.clearTimeout(id);
  }, [open, view, busy]);

  React.useEffect(() => {
    if (!open) return;
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [msgs, busy, open]);

  React.useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [open]);

  const buttonHidden = HIDDEN.some((r) => r.test(pathname));
  if (buttonHidden && !open) return null;

  const send = async (text: string, base: Msg[] = msgs) => {
    const q = text.trim();
    if (!q || busy) return;
    const next: Msg[] = [...base, { role: "user", content: q.slice(0, 4000) }];
    setMsgs(next);
    setInput("");
    if (wantsLiveAgent(q)) {
      goLive(next);
      return;
    }
    setBusy(true);
    try {
      const history = next.filter((m) => !m.error).map((m) => ({ role: m.role, content: m.content }));
      const res = await askJenvu({ data: { messages: history } });
      if (res.ok && res.agent) goLive(next);
      else if (res.ok) setMsgs([...next, { role: "assistant", content: res.text, followUps: res.followUps, showSales: res.showSales }]);
      else setMsgs([...next, { role: "assistant", content: res.error, error: true }]);
    } catch {
      setMsgs([...next, { role: "assistant", content: "Ask Jenvu couldn't answer right now. Please try again.", error: true }]);
    } finally {
      setBusy(false);
    }
  };

  /** Hand the conversation to a person: live chat opens in this same window. */
  const goLive = (base: Msg[]) => {
    const asked = base.filter((m) => m.role === "user").slice(-5).map((m) => `- ${m.content}`);
    setHandoff(asked.length ? `Handed over from Ask Jenvu. Earlier questions:\n${asked.join("\n")}` : "");
    setMsgs([...base, { role: "assistant", content: "Sure — I'm connecting you to our support team. A real person will reply in this window." }]);
    setView("live");
  };

  const retry = (i: number) => {
    const userIdx = i - 1;
    if (userIdx < 0 || msgs[userIdx]?.role !== "user") return;
    void send(msgs[userIdx].content, msgs.slice(0, userIdx));
  };

  const empty = msgs.length === 0;

  return (
    <>
      {!open && !buttonHidden && (
        <button
          type="button"
          onClick={() => { setView("chat"); setOpen(true); }}
          aria-label="Ask Jenvu"
          className={[
            "fixed bottom-3 right-3 sm:bottom-5 sm:right-5 z-[9998] flex h-12 sm:h-14 items-center justify-center gap-2.5 rounded-2xl bg-gc-sky text-[15px] font-medium text-gc-blue-deep",
            "shadow-[0_2px_6px_rgba(60,64,67,0.15),0_6px_18px_rgba(60,64,67,0.18)] transition-all duration-300 hover:brightness-95",
            compact ? "w-12 sm:w-14 px-0" : "px-4 sm:px-6",
          ].join(" ")}
        >
          <img src={askJenvuMark} alt="" className="h-5 w-auto shrink-0" />
          {!compact && <span className="whitespace-nowrap">Ask Jenvu</span>}
        </button>
      )}

      {(open || mounted) && (
        <div
          role="dialog"
          aria-label="Ask Jenvu"
          aria-hidden={!open}
          inert={!open}
          className={[
            "fixed inset-x-2 bottom-2 top-16 z-[9999] flex flex-col overflow-hidden rounded-2xl bg-background text-gc-ink shadow-[0_4px_12px_rgba(60,64,67,0.2),0_16px_48px_rgba(60,64,67,0.25)] ring-1 ring-gc-line sm:inset-x-auto sm:right-4 sm:bottom-4 sm:top-auto sm:h-[min(560px,calc(100vh-6rem))] sm:w-[min(640px,calc(100vw-2rem))]",
            "[contain:layout_paint] will-change-[opacity,transform] transition-[opacity,transform,visibility] duration-200 ease-out",
            open ? "visible translate-y-0 opacity-100" : "pointer-events-none invisible translate-y-4 opacity-0",
          ].join(" ")}
        >
          {/* Header */}
          <div className="relative flex h-14 shrink-0 items-center gap-2 px-5">
            {view !== "chat" ? (
              <button type="button" onClick={() => setView("chat")} className="-ml-2 flex items-center gap-3 rounded-full py-1.5 pl-2 pr-3 text-[15px] hover:bg-gc-surface">
                <ArrowLeft className="h-5 w-5" /> Return to conversation
              </button>
            ) : (
              <span className="text-[16px]">Ask Jenvu</span>
            )}
            <div className="ml-auto flex items-center">
              {!empty && (
                <button type="button" aria-label="More options" onClick={() => setMenu((m) => !m)} className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-gc-surface">
                  <MoreVertical className="h-5 w-5" />
                </button>
              )}
              <button type="button" aria-label="Close" onClick={() => setOpen(false)} className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-gc-surface">
                <X className="h-5 w-5" />
              </button>
            </div>
            {menu && (
              <div className="absolute right-14 top-12 z-10 w-48 rounded-lg bg-background py-1 shadow-lg ring-1 ring-gc-line">
                <button type="button" className="w-full px-4 py-2 text-left text-[14px] hover:bg-gc-surface" onClick={() => { setMsgs([]); setView("chat"); setMenu(false); }}>
                  New conversation
                </button>
                <button type="button" className="w-full px-4 py-2 text-left text-[14px] hover:bg-gc-surface" onClick={() => { setView("sales"); setMenu(false); }}>
                  Contact sales
                </button>
                <button type="button" className="w-full px-4 py-2 text-left text-[14px] hover:bg-gc-surface" onClick={() => { goLive(msgs); setMenu(false); }}>
                  Chat with a person
                </button>
              </div>
            )}
          </div>

          {view === "live" ? (
            <LiveChatPanel handoff={handoff} />
          ) : view === "sales" ? (
            <SalesForm onDone={() => setView("chat")} />
          ) : (
            <>
              <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-6 pb-4">
                {empty ? (
                  <div className="flex min-h-full flex-col justify-center py-4">
                    <h2 className="mx-auto max-w-[460px] text-center text-[26px] font-normal leading-[1.3]">
                      What would you like to know about ?
                    </h2>
                    <div className="mt-6 space-y-2.5">
                      {STARTERS.map((s) => (
                        <button key={s} type="button" onClick={() => send(s)} className="flex w-full items-center justify-between gap-3 rounded-full bg-gc-surface px-6 py-4 text-left text-[14px] transition hover:bg-gc-blue-soft">
                          <span>{s}</span>
                          <CornerDownRight className="h-5 w-5 shrink-0" />
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-5 pt-2">
                    {msgs.map((m, i) =>
                      m.role === "user" ? (
                        <div key={i} className="flex justify-end">
                          <p className="max-w-[80%] whitespace-pre-wrap break-words rounded-2xl bg-gc-notice px-4 py-2.5 text-[15px] leading-snug text-gc-ink">{m.content}</p>
                        </div>
                      ) : (
                        <AssistantTurn
                          key={i}
                          msg={m}
                          last={i === msgs.length - 1}
                          onRetry={() => retry(i)}
                          onAsk={(q) => send(q)}
                          onSales={() => setView("sales")}
                        />
                      ),
                    )}
                    {busy && (
                      <div className="flex items-center gap-2.5 text-[15px]" role="status">
                        <span aria-hidden className="ask-jenvu-mark-ring h-6 w-10 shrink-0" style={{ ["--mark" as string]: `url(${askJenvuMark})` }}><span className="ask-jenvu-mark-loop h-full w-full" /></span>
                        <Shimmer>Thinking about your question…</Shimmer>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="shrink-0 px-5 pb-3">
                <form
                  onSubmit={(e) => { e.preventDefault(); void send(input); }}
                  className="flex items-center gap-3 rounded-full bg-background py-2 pl-5 pr-2 shadow-[0_1px_3px_rgba(60,64,67,0.2),0_2px_8px_rgba(60,64,67,0.15)] ring-1 ring-gc-line"
                >
                  <SearchCheck className="h-5 w-5 shrink-0 text-gc-ink-muted" />
                  <textarea
                    ref={inputRef}
                    rows={1}
                    value={input}
                    maxLength={4000}
                    disabled={busy}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(input); } }}
                    placeholder={empty ? "Ask a question" : "Ask a follow-up"}
                    aria-label="Ask a question"
                    className="max-h-28 min-w-0 flex-1 resize-none bg-transparent py-2 text-[16px] outline-none placeholder:text-gc-ink-muted"
                  />
                  <button
                    type="submit"
                    aria-label="Send"
                    disabled={busy || !input.trim()}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gc-blue text-gc-on-blue transition disabled:bg-gc-surface disabled:text-gc-ink-muted"
                  >
                    <ArrowUp className="h-5 w-5" />
                  </button>
                </form>
                <p className="mt-2.5 text-center text-[12px] text-gc-ink-muted">Built with Jenvu AI</p>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}

function AssistantTurn({ msg, last, onRetry, onAsk, onSales }: {
  msg: Msg; last: boolean; onRetry: () => void; onAsk: (q: string) => void; onSales: () => void;
}) {
  const [vote, setVote] = React.useState<"up" | "down" | null>(null);
  if (msg.error) {
    return (
      <div className="rounded-lg bg-gc-red-soft px-4 py-3 text-[14px] text-gc-ink">
        {msg.content}
        <button type="button" onClick={onRetry} className="ml-2 font-medium text-gc-blue hover:underline">Try again</button>
      </div>
    );
  }
  return (
    <div>
      <div className="text-[15px] leading-[1.6] [&_li]:my-1 [&_p]:my-3 [&_ul]:my-3 [&_ul]:pl-5">
        <MessageResponse>{msg.content}</MessageResponse>
      </div>
      {msg.showSales && (
        <div className="mt-5 border-t border-gc-line pt-5">
          <p className="text-[15px]">How would you like to begin? 🚀</p>
          <button type="button" onClick={onSales} className="mt-3 flex items-center gap-3 rounded-full bg-gc-blue-soft py-2 pl-5 pr-2 text-[16px] text-gc-blue-deep transition hover:brightness-95">
            <FileText className="h-5 w-5" />
            <span className="mr-6">Contact sales</span>
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gc-blue text-gc-on-blue">
              <Maximize2 className="h-4 w-4" />
            </span>
          </button>
        </div>
      )}
      <div className="mt-5 flex items-center gap-1 text-gc-ink-muted">
        <span className="mr-auto text-[12px]">AI responses may include mistakes</span>
        <IconBtn label="Good response" active={vote === "up"} onClick={() => setVote("up")}><ThumbsUp className="h-5 w-5" /></IconBtn>
        <IconBtn label="Bad response" active={vote === "down"} onClick={() => setVote("down")}><ThumbsDown className="h-5 w-5" /></IconBtn>
        <IconBtn label="Regenerate" onClick={onRetry}><RotateCw className="h-5 w-5" /></IconBtn>
        <IconBtn label="Copy" onClick={() => { void navigator.clipboard.writeText(msg.content); toast.success("Copied"); }}><Copy className="h-5 w-5" /></IconBtn>
      </div>
      {last && !!msg.followUps?.length && (
        <div className="mt-5 flex flex-wrap gap-2.5">
          {msg.followUps.map((q) => (
            <button key={q} type="button" onClick={() => onAsk(q)} className="flex items-center gap-2 rounded-full px-4 py-2 text-left text-[14px] ring-1 ring-gc-line transition hover:bg-gc-surface">
              <CornerDownRight className="h-4 w-4 shrink-0 text-gc-blue" /> {q}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function IconBtn({ label, active, onClick, children }: { label: string; active?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" aria-label={label} onClick={onClick} className={`flex h-9 w-9 items-center justify-center rounded-full hover:bg-gc-surface ${active ? "text-gc-blue" : ""}`}>
      {children}
    </button>
  );
}

const TOPICS = ["Plans and pricing", "Jenvu Terminal", "Founding Program", "API and developers", "Business or team use", "Something else"];

function SalesForm({ onDone }: { onDone: () => void }) {
  const [f, setF] = React.useState({ first: "", last: "", email: "", phone: "", company: "", topic: "", message: "" });
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [sending, setSending] = React.useState(false);
  const [sent, setSent] = React.useState(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setF((p) => ({ ...p, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const er: Record<string, string> = {};
    if (!f.first.trim()) er.first = "Required";
    if (!f.last.trim()) er.last = "Required";
    if (!/^\S+@\S+\.\S+$/.test(f.email.trim())) er.email = "Enter a valid email";
    if (!f.phone.trim()) er.phone = "Required";
    else if (!/^[+()\-.\s\d]{5,30}$/.test(f.phone.trim())) er.phone = "Enter a valid phone number";
    if (!f.topic) er.topic = "Choose a topic";
    setErrors(er);
    if (Object.keys(er).length) return;
    setSending(true);
    try {
      const message = [
        "Call back request from Ask Jenvu.",
        `Topic: ${f.topic}`,
        f.company.trim() ? `Company: ${f.company.trim()}` : "",
        f.message.trim() ? `\n${f.message.trim()}` : "",
      ].filter(Boolean).join("\n");
      const res = await submitContactMessage({
        data: {
          name: `${f.first.trim()} ${f.last.trim()}`.slice(0, 100),
          email: f.email.trim(),
          phone: f.phone.trim(),
          subject: `Sales call back: ${f.topic}`,
          message: message.slice(0, 2000),
        },
      });
      if (res.ok) setSent(true);
      else toast.error(res.error);
    } catch {
      toast.error("We couldn't send your request. Please try again.");
    } finally {
      setSending(false);
    }
  };

  if (sent) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
        <CheckCircle2 className="h-12 w-12 text-gc-success" />
        <h3 className="mt-4 text-[20px]">Thanks, we'll call you back</h3>
        <p className="mt-2 text-[14px] text-gc-ink-muted">Our team replies Monday to Friday, 09:00 – 18:00 UTC.</p>
        <button type="button" onClick={onDone} className="mt-6 rounded-full bg-gc-blue px-6 py-2.5 text-[14px] font-medium text-gc-on-blue hover:bg-gc-blue-hover">
          Return to conversation
        </button>
      </div>
    );
  }

  const cls = (k: string) =>
    `w-full rounded-[4px] border bg-background px-4 py-3.5 text-[15px] text-gc-ink outline-none placeholder:text-gc-ink-muted focus:border-gc-blue-deep focus:ring-1 focus:ring-gc-blue-deep ${errors[k] ? "border-destructive" : "border-gc-ink-muted/50"}`;
  const Err = ({ k }: { k: string }) => (errors[k] ? <p className="mt-1 text-[12px] text-destructive">{errors[k]}</p> : null);

  return (
    <form onSubmit={submit} className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 pb-6 pt-2" noValidate>
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gc-blue-deep text-gc-on-blue">
          <FileText className="h-4 w-4" />
        </span>
        <h3 className="text-[15px]">Request a call back</h3>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div><input aria-label="First name" placeholder="First name*" value={f.first} onChange={set("first")} maxLength={50} className={cls("first")} /><Err k="first" /></div>
        <div><input aria-label="Last name" placeholder="Last name*" value={f.last} onChange={set("last")} maxLength={50} className={cls("last")} /><Err k="last" /></div>
      </div>
      <div><input type="email" aria-label="Email" placeholder="Email*" value={f.email} onChange={set("email")} maxLength={255} className={cls("email")} /><Err k="email" /></div>
      <div><input type="tel" aria-label="Phone" placeholder="Phone number*" value={f.phone} onChange={set("phone")} maxLength={30} className={cls("phone")} /><Err k="phone" /></div>
      <div><input aria-label="Company" placeholder="Company name (optional)" value={f.company} onChange={set("company")} maxLength={100} className={cls("company")} /></div>
      <div>
        <select aria-label="Topic" value={f.topic} onChange={set("topic")} className={`${cls("topic")} ${f.topic ? "" : "text-gc-ink-muted"}`}>
          <option value="" disabled>What can we help with?*</option>
          {TOPICS.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <Err k="topic" />
      </div>
      <div><textarea aria-label="Message" placeholder="Anything else? (optional)" rows={3} value={f.message} onChange={set("message")} maxLength={1500} className={`${cls("message")} resize-none`} /></div>
      <button type="submit" disabled={sending} className="inline-flex h-11 items-center gap-2 rounded-full bg-gc-blue-deep px-6 text-[15px] font-medium text-gc-on-blue transition hover:bg-gc-blue disabled:opacity-60">
        {sending && <Loader2 className="h-4 w-4 animate-spin" />} Submit request
      </button>
      <p className="text-[13px] leading-relaxed text-gc-ink-muted">
        I understand my personal data will be processed in accordance with Jenvu's{" "}
        <a href="/privacy" className="text-gc-blue underline">Privacy Policy</a>.
      </p>
    </form>
  );
}
