import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  MessageSquare,
  Send,
  Loader2,
  X,
  Search,
  Inbox,
  CheckCircle2,
  Mail,
  Clock,
  ChevronLeft,
  LogOut,
  Filter,
} from "lucide-react";
import {
  adminMe,
  adminLogout,
  adminListSessions,
  adminGetMessages,
  adminReply,
  adminCloseSession,
} from "@/lib/admin-gate.functions";

export const Route = createFileRoute("/jenvu-ops-x9k2/inbox")({
  head: () => ({
    meta: [
      { title: "Support Inbox — Admin" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminInbox,
});

type Session = {
  id: string;
  source: "chat" | "form";
  guest_name: string | null;
  guest_email: string | null;
  status: string;
  last_message_at: string;
  unread_admin: number;
  created_at: string;
  subject?: string | null;
};

type Message = {
  id: string;
  sender: "guest" | "admin";
  content: string;
  created_at: string;
};

function initials(name?: string | null, email?: string | null) {
  const src = (name || email || "?").trim();
  const parts = src.split(/[\s@._-]+/).filter(Boolean);
  return (parts[0]?.[0] || "?").toUpperCase() + (parts[1]?.[0]?.toUpperCase() || "");
}

function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}

function AdminInbox() {
  const navigate = useNavigate();
  const me = useServerFn(adminMe);
  const logoutFn = useServerFn(adminLogout);
  const listFn = useServerFn(adminListSessions);
  const messagesFn = useServerFn(adminGetMessages);
  const replyFn = useServerFn(adminReply);
  const closeFn = useServerFn(adminCloseSession);

  const [ready, setReady] = useState(false);
  const [username, setUsername] = useState<string | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [filter, setFilter] = useState<"open" | "closed" | "all">("open");
  const [query, setQuery] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    me().then((r) => {
      if (!r.unlocked) navigate({ to: "/jenvu-ops-x9k2", replace: true });
      else {
        setUsername(r.username);
        setReady(true);
      }
    });
  }, [me, navigate]);

  const loadSessions = useCallback(async () => {
    try {
      const r = await listFn();
      setSessions(r.sessions as Session[]);
    } catch (e) {
      console.error(e);
    }
  }, [listFn]);

  const loadMessages = useCallback(
    async (sid: string) => {
      try {
        const r = await messagesFn({ data: { sessionId: sid } });
        setMessages(r.messages as Message[]);
      } catch (e) {
        console.error(e);
      }
    },
    [messagesFn],
  );

  useEffect(() => {
    if (!ready) return;
    loadSessions();
    const id = setInterval(loadSessions, 4000);
    return () => clearInterval(id);
  }, [ready, loadSessions]);

  useEffect(() => {
    if (!ready || !activeId) return;
    loadMessages(activeId);
    const id = setInterval(() => loadMessages(activeId), 3000);
    return () => clearInterval(id);
  }, [ready, activeId, loadMessages]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return sessions.filter((s) => {
      if (filter !== "all" && s.status !== filter) return false;
      if (!q) return true;
      return (
        (s.guest_name || "").toLowerCase().includes(q) ||
        (s.guest_email || "").toLowerCase().includes(q)
      );
    });
  }, [sessions, filter, query]);

  const stats = useMemo(() => {
    const open = sessions.filter((s) => s.status === "open").length;
    const unread = sessions.reduce((a, s) => a + (s.unread_admin || 0), 0);
    return { open, total: sessions.length, unread };
  }, [sessions]);

  const activeSession = sessions.find((s) => s.id === activeId) ?? null;

  async function handleReply(e: React.FormEvent) {
    e.preventDefault();
    const content = input.trim();
    if (!content || !activeId || sending) return;
    setSending(true);
    try {
      await replyFn({ data: { sessionId: activeId, content } });
      setInput("");
      await loadMessages(activeId);
      await loadSessions();
    } catch (err) {
      console.error(err);
      alert("Failed to send reply.");
    } finally {
      setSending(false);
    }
  }

  async function handleClose() {
    if (!activeId) return;
    if (!confirm("Close this chat? The visitor can start a new one.")) return;
    try {
      await closeFn({ data: { sessionId: activeId } });
      await loadSessions();
    } catch {
      alert("Failed to close chat.");
    }
  }

  async function handleLogout() {
    await logoutFn();
    navigate({ to: "/jenvu-ops-x9k2", replace: true });
  }

  if (!ready) {
    return (
      <div className="grid min-h-screen place-items-center bg-background">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background font-sans text-foreground">
      {/* Top bar */}
      <div className="border-b border-border bg-background">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="relative grid h-9 w-9 place-items-center overflow-hidden rounded-xl bg-white ring-1 ring-border">
              <img src="/favicon.png" alt="Jenvu" className="h-5 w-5 object-contain" />
              <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-background" />
            </span>
            <div>
              <h1 className="font-display text-xl font-medium tracking-tight text-foreground">
                Support Inbox
              </h1>
              <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <span className="inline-block h-1 w-1 rounded-full bg-emerald-500" />
                <span>Live</span>
                <span className="text-border">·</span>
                <span className="font-medium text-foreground">{username}</span>
              </div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-muted"
          >
            <LogOut className="h-3.5 w-3.5" /> Sign out
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 space-y-5">
        <div>
          <h2 className="font-display text-3xl font-medium tracking-tight text-foreground">
            Support Inbox
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Reply to visitors from live chat and contact form submissions in real time.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <StatCard label="Open" value={stats.open} icon={<Inbox className="h-4 w-4" />} />
          <StatCard label="Unread" value={stats.unread} icon={<Mail className="h-4 w-4" />} highlight={stats.unread > 0} />
          <StatCard label="Total" value={stats.total} icon={<MessageSquare className="h-4 w-4" />} />
        </div>

        <div className="flex h-[calc(100vh-19rem)] min-h-[500px] overflow-hidden rounded-xl border border-border bg-card">
          {/* Sidebar */}
          <aside
            className={`flex w-full flex-col border-r border-border sm:w-[320px] ${activeId ? "hidden sm:flex" : "flex"}`}
          >
            <div className="border-b border-border p-3">
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search name or email…"
                  className="w-full rounded-lg border border-border bg-background py-2 pl-8 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/30"
                />
              </div>
              <div className="mt-2 flex items-center gap-1.5">
                <Filter className="ml-0.5 h-3 w-3 text-muted-foreground" />
                <div className="flex flex-1 gap-1 rounded-lg bg-muted p-0.5 text-xs">
                  {(["open", "closed", "all"] as const).map((k) => (
                    <button
                      key={k}
                      onClick={() => setFilter(k)}
                      className={`flex-1 rounded-md px-2 py-1 capitalize transition ${
                        filter === k
                          ? "bg-background text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {k}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {filtered.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center px-6 py-10 text-center">
                  <div className="grid h-12 w-12 place-items-center rounded-full bg-muted">
                    <Inbox className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <p className="mt-3 text-sm font-medium text-foreground">All clear</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {filter === "open" ? "You're all caught up." : "Nothing matches this filter."}
                  </p>
                </div>
              ) : (
                <ul className="divide-y divide-border">
                  {filtered.map((s) => {
                    const isActive = s.id === activeId;
                    const name = s.guest_name || s.guest_email?.split("@")[0] || "Anonymous";
                    return (
                      <li key={s.id}>
                        <button
                          onClick={() => setActiveId(s.id)}
                          className={`relative flex w-full items-start gap-3 px-4 py-3 text-left transition ${
                            isActive ? "bg-muted" : "hover:bg-muted/50"
                          }`}
                        >
                          {isActive && (
                            <span className="absolute inset-y-2 left-0 w-0.5 rounded-r-full bg-foreground" />
                          )}
                          <div className="relative shrink-0">
                            <div className="grid h-9 w-9 place-items-center rounded-full bg-muted text-[11px] font-semibold text-foreground ring-1 ring-border">
                              {initials(s.guest_name, s.guest_email)}
                            </div>
                            <span
                              className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-card ${
                                s.status === "open" ? "bg-emerald-500" : "bg-muted-foreground/40"
                              }`}
                            />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex min-w-0 items-center gap-1.5">
                                <span className="truncate text-sm font-medium text-foreground">{name}</span>
                                <SourceBadge source={s.source} />
                              </div>
                              <span className="shrink-0 text-[10px] text-muted-foreground">
                                {timeAgo(s.last_message_at)}
                              </span>
                            </div>
                            <div className="mt-0.5 flex items-center justify-between gap-2">
                              <span className="truncate text-xs text-muted-foreground">{s.guest_email || "No email"}</span>
                              {s.unread_admin > 0 && (
                                <span className="grid h-4 min-w-[16px] shrink-0 place-items-center rounded-full bg-foreground px-1.5 text-[10px] font-semibold text-background">
                                  {s.unread_admin}
                                </span>
                              )}
                            </div>
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </aside>

          {/* Conversation */}
          <section
            className={`flex flex-1 flex-col bg-background ${activeId ? "flex" : "hidden sm:flex"}`}
          >
            {!activeSession ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
                <div className="grid h-14 w-14 place-items-center rounded-full bg-muted">
                  <MessageSquare className="h-6 w-6 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-display text-lg font-medium tracking-tight text-foreground">
                    Pick a conversation
                  </p>
                  <p className="mx-auto mt-1 max-w-xs text-sm text-muted-foreground">
                    Select a thread from the left to read messages and reply.
                  </p>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3 border-b border-border bg-card px-5 py-3">
                  <button
                    onClick={() => setActiveId(null)}
                    className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:bg-muted sm:hidden"
                    aria-label="Back"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <div className="grid h-10 w-10 place-items-center rounded-full bg-muted text-xs font-semibold text-foreground ring-1 ring-border">
                    {initials(activeSession.guest_name, activeSession.guest_email)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-display truncate text-base font-medium text-foreground">
                        {activeSession.guest_name || "Anonymous visitor"}
                      </span>
                      <SourceBadge source={activeSession.source} />
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                          activeSession.status === "open"
                            ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                            : "bg-muted text-muted-foreground ring-1 ring-border"
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            activeSession.status === "open" ? "bg-emerald-500" : "bg-muted-foreground/40"
                          }`}
                        />
                        {activeSession.status}
                      </span>
                    </div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
                      {activeSession.guest_email && (
                        <span className="flex items-center gap-1 truncate">
                          <Mail className="h-3 w-3" /> {activeSession.guest_email}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" /> Started{" "}
                        {new Date(activeSession.created_at).toLocaleString()}
                      </span>
                    </div>
                  </div>
                  {activeSession.status === "open" ? (
                    <button
                      onClick={handleClose}
                      className="hidden items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-muted sm:inline-flex"
                    >
                      <X className="h-3.5 w-3.5" /> Close
                    </button>
                  ) : (
                    <span className="hidden items-center gap-1 rounded-lg bg-muted px-3 py-1.5 text-xs font-medium text-muted-foreground ring-1 ring-border sm:inline-flex">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Closed
                    </span>
                  )}
                </div>

                <div
                  ref={scrollRef}
                  className="flex-1 space-y-3 overflow-y-auto bg-muted/30 p-5"
                >
                  {messages.length === 0 && (
                    <div className="py-8 text-center text-xs text-muted-foreground">No messages yet.</div>
                  )}
                  {messages.map((m) => {
                    const isAdminMsg = m.sender === "admin";
                    return (
                      <div
                        key={m.id}
                        className={`flex ${isAdminMsg ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[75%] whitespace-pre-wrap break-words rounded-2xl px-4 py-2.5 text-sm ${
                            isAdminMsg
                              ? "rounded-br-sm bg-primary text-primary-foreground"
                              : "rounded-bl-sm bg-card text-foreground ring-1 ring-border"
                          }`}
                        >
                          {m.content}
                          <div
                            className={`mt-1 text-[10px] ${isAdminMsg ? "text-primary-foreground/70" : "text-muted-foreground"}`}
                          >
                            {new Date(m.created_at).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {activeSession.source === "form" ? (
                  <div className="flex items-center justify-between gap-2 border-t border-border bg-card p-4">
                    <div className="text-xs text-muted-foreground">
                      Contact form submission — reply directly via email.
                    </div>
                    {activeSession.guest_email && (
                      <a
                        href={`mailto:${activeSession.guest_email}${
                          activeSession.subject
                            ? `?subject=${encodeURIComponent("Re: " + activeSession.subject)}`
                            : ""
                        }`}
                        className="inline-flex items-center gap-2 rounded-lg bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90"
                      >
                        <Mail className="h-4 w-4" />
                        <span>Reply via email</span>
                      </a>
                    )}
                  </div>
                ) : (
                  <form onSubmit={handleReply} className="border-t border-border bg-card p-3">
                    {activeSession.status === "closed" ? (
                      <div className="flex items-center justify-center gap-2 rounded-lg bg-muted py-2.5 text-xs text-muted-foreground ring-1 ring-border">
                        <CheckCircle2 className="h-3.5 w-3.5" /> This conversation is closed.
                      </div>
                    ) : (
                      <div className="flex items-end gap-2 rounded-xl border border-border bg-background p-2 transition focus-within:ring-2 focus-within:ring-ring/30">
                        <textarea
                          value={input}
                          onChange={(e) => setInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                              e.preventDefault();
                              handleReply(e as unknown as React.FormEvent);
                            }
                          }}
                          placeholder="Type your reply…  (Shift+Enter for new line)"
                          rows={1}
                          maxLength={4000}
                          className="max-h-40 min-h-[36px] flex-1 resize-none bg-transparent px-2 py-1.5 text-sm text-foreground outline-none placeholder:text-muted-foreground"
                        />
                        <button
                          type="submit"
                          disabled={sending || !input.trim()}
                          className="inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-3.5 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                          <span className="hidden sm:inline">Send</span>
                        </button>
                      </div>
                    )}
                  </form>
                )}
              </>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  highlight,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <div className="rounded-xl border border-border bg-card px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-muted text-muted-foreground">
            {icon}
          </span>
          <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            {label}
          </span>
        </div>
        <div
          className={`font-display text-2xl font-medium leading-none tabular-nums ${
            highlight ? "text-foreground" : "text-foreground"
          }`}
        >
          {value}
        </div>
      </div>
    </div>
  );
}

function SourceBadge({ source }: { source: "chat" | "form" }) {
  if (source === "form") {
    return (
      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-muted px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide text-muted-foreground ring-1 ring-border">
        <Mail className="h-2.5 w-2.5" /> Form
      </span>
    );
  }
  return (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-muted px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide text-muted-foreground ring-1 ring-border">
      <MessageSquare className="h-2.5 w-2.5" /> Chat
    </span>
  );
}
