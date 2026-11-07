import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Send,
  Loader2,
  Search,
  Inbox,
  CheckCircle2,
  Mail,
  ChevronLeft,
  LogOut,
  Filter,
  Zap,
  Command,
  CornerDownLeft,
  CircleDot,
  Circle,
  Archive,
  Copy,
  User as UserIcon,
  Calendar,
  Hash,
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
  guest_name: string | null;
  guest_email: string | null;
  status: string;
  last_message_at: string;
  unread_admin: number;
  created_at: string;
};

type Message = {
  id: string;
  sender: "guest" | "admin";
  content: string;
  created_at: string;
};

type FilterKey = "open" | "unread" | "closed" | "all";

const CANNED = [
  { key: "hello", label: "Greeting", text: "Hi! Thanks for reaching out — how can I help today?" },
  { key: "checking", label: "Investigating", text: "Thanks for the details. Let me check this and get back to you shortly." },
  { key: "resolved", label: "Resolved", text: "This should be resolved on our end. Please refresh and let me know if it works." },
  { key: "credits", label: "About scans", text: "Each plan includes a monthly scan allowance. You can see your current balance on the dashboard." },
  { key: "closing", label: "Closing", text: "Glad I could help! I'll close this chat — feel free to open a new one anytime." },
];

function initials(name?: string | null, email?: string | null) {
  const src = (name || email || "?").trim();
  const parts = src.split(/[\s@._-]+/).filter(Boolean);
  return (parts[0]?.[0] || "?").toUpperCase() + (parts[1]?.[0]?.toUpperCase() || "");
}

const AVATAR_PALETTE = [
  "bg-gradient-to-br from-emerald-500 to-emerald-700",
  "bg-gradient-to-br from-teal-500 to-teal-700",
  "bg-gradient-to-br from-cyan-500 to-cyan-700",
  "bg-gradient-to-br from-sky-500 to-sky-700",
  "bg-gradient-to-br from-blue-500 to-blue-700",
  "bg-gradient-to-br from-indigo-500 to-indigo-700",
  "bg-gradient-to-br from-violet-500 to-violet-700",
  "bg-gradient-to-br from-fuchsia-500 to-fuchsia-700",
  "bg-gradient-to-br from-pink-500 to-pink-700",
  "bg-gradient-to-br from-rose-500 to-rose-700",
  "bg-gradient-to-br from-red-500 to-red-700",
  "bg-gradient-to-br from-orange-500 to-orange-700",
  "bg-gradient-to-br from-amber-500 to-amber-700",
  "bg-gradient-to-br from-lime-600 to-lime-800",
  "bg-gradient-to-br from-green-500 to-green-700",
];

function avatarColor(name?: string | null, email?: string | null) {
  const src = (email || name || "?").toLowerCase().trim();
  let h = 0;
  for (let i = 0; i < src.length; i++) h = (h * 31 + src.charCodeAt(i)) >>> 0;
  return AVATAR_PALETTE[h % AVATAR_PALETTE.length];
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
  const [filter, setFilter] = useState<FilterKey>("open");
  const [query, setQuery] = useState("");
  const [showCanned, setShowCanned] = useState(false);
  const [copied, setCopied] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    me().then((r) => {
      if (!r.unlocked) {
        navigate({ to: "/jenvu-ops-x9k2", replace: true });
      } else {
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
      if (filter === "open" && s.status !== "open") return false;
      if (filter === "closed" && s.status !== "closed") return false;
      if (filter === "unread" && !(s.unread_admin > 0)) return false;
      if (!q) return true;
      return (
        (s.guest_name || "").toLowerCase().includes(q) ||
        (s.guest_email || "").toLowerCase().includes(q)
      );
    });
  }, [sessions, filter, query]);

  const counts = useMemo(() => {
    const open = sessions.filter((s) => s.status === "open").length;
    const closed = sessions.filter((s) => s.status === "closed").length;
    const unread = sessions.filter((s) => s.unread_admin > 0).length;
    const unreadMsgs = sessions.reduce((a, s) => a + (s.unread_admin || 0), 0);
    return { open, closed, unread, all: sessions.length, unreadMsgs };
  }, [sessions]);

  const activeSession = sessions.find((s) => s.id === activeId) ?? null;

  // Keyboard shortcuts: j/k navigate, r reply, e close, / search, esc back
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName;
      const inField = tag === "INPUT" || tag === "TEXTAREA";
      if (e.key === "/" && !inField) {
        e.preventDefault();
        searchRef.current?.focus();
        return;
      }
      if (e.key === "Escape" && inField) {
        (e.target as HTMLElement).blur();
        return;
      }
      if (inField) return;
      if (e.key === "j" || e.key === "k") {
        e.preventDefault();
        const idx = filtered.findIndex((s) => s.id === activeId);
        const next = e.key === "j" ? Math.min(filtered.length - 1, idx + 1) : Math.max(0, idx - 1);
        if (filtered[next]) setActiveId(filtered[next].id);
      }
      if (e.key === "r" && activeId) {
        e.preventDefault();
        inputRef.current?.focus();
      }
      if (e.key === "e" && activeId && activeSession?.status === "open") {
        e.preventDefault();
        handleClose();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered, activeId, activeSession?.status]);

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

  function copyEmail(email: string) {
    navigator.clipboard.writeText(email).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    });
  }

  if (!ready) {
    return (
      <div className="grid min-h-screen place-items-center bg-background">
        <Loader2 className="h-5 w-5 animate-spin text-gc-ink-muted" />
      </div>
    );
  }

  const filters: { key: FilterKey; label: string; count: number; icon: React.ReactNode }[] = [
    { key: "open", label: "Open", count: counts.open, icon: <CircleDot className="h-3.5 w-3.5" /> },
    { key: "unread", label: "Unread", count: counts.unread, icon: <Zap className="h-3.5 w-3.5" /> },
    { key: "closed", label: "Closed", count: counts.closed, icon: <CheckCircle2 className="h-3.5 w-3.5" /> },
    { key: "all", label: "All", count: counts.all, icon: <Inbox className="h-3.5 w-3.5" /> },
  ];

  return (
    <div className="ops-console flex h-dvh flex-col bg-background text-[13px] text-foreground antialiased [font-family:'Google_Sans_Flex','Google_Sans','Product_Sans','Poppins',system-ui,-apple-system,sans-serif]">
      <div className="ops-zoom flex min-h-0 flex-1 flex-col" style={{ minHeight: 0 }}>
        {/* Page header — same as the dashboard pages */}
        <header className="mx-auto flex w-full max-w-[1280px] shrink-0 flex-col gap-4 px-4 pt-6 sm:flex-row sm:items-end sm:justify-between sm:px-6 lg:pt-8">
          <div className="min-w-0">
            <h1 className="text-[28px] font-normal tracking-tight text-foreground sm:text-[32px]">Support</h1>
            <p className="mt-1 text-[14px] text-muted-foreground">
              {counts.unread > 0
                ? `${counts.unread} conversation${counts.unread === 1 ? "" : "s"} waiting for a reply.`
                : "Live chat from the website. Everyone has a reply."}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {username && <span className="ops-chip hidden rounded-full px-3 py-1.5 text-[12.5px] sm:inline">{username}</span>}
            <button onClick={handleLogout} className="ops-btn inline-flex h-9 items-center gap-1.5 rounded-full px-4 text-[13px] font-medium" title="Sign out">
              <LogOut className="h-3.5 w-3.5" /> Sign out
            </button>
          </div>
        </header>

        <div className="mx-auto w-full max-w-[1280px] shrink-0 px-4 pt-5 sm:px-6">
          <div className="ops-tabs flex max-w-full items-center gap-1 overflow-x-auto rounded-full p-1 text-[13px] [scrollbar-width:none] sm:w-fit">
            {filters.map((f) => {
              const active = filter === f.key;
              return (
                <button
                  key={f.key}
                  onClick={() => setFilter(f.key)}
                  className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-1.5 transition ${
                    active ? "ops-tab-active font-medium text-foreground" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {f.label}
                  <span className={`text-[11.5px] tabular-nums ${f.key === "unread" && f.count > 0 ? "ops-count rounded-full px-1.5" : "text-muted-foreground"}`}>
                    {f.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="mx-auto flex min-h-0 w-full max-w-[1280px] flex-1 gap-4 px-4 pb-5 pt-4 sm:px-6">
          {/* Conversation list */}
          <aside className={`ops-card min-h-0 w-full shrink-0 flex-col overflow-hidden rounded-2xl md:w-[340px] ${activeId ? "hidden md:flex" : "flex"}`}>
            <div className="ops-line border-b p-3">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <input
                  ref={searchRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search name or email"
                  className="ops-input h-9 w-full rounded-full pl-8 pr-3 text-[13px] outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-foreground/15"
                />
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-1.5">
              {filtered.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center px-6 py-10 text-center">
                  <Inbox className="h-5 w-5 text-muted-foreground" />
                  <p className="mt-3 text-[13.5px] font-medium">No conversations</p>
                  <p className="mt-1 text-[12.5px] text-muted-foreground">
                    {filter === "open" ? "You're all caught up." : "Nothing matches this filter."}
                  </p>
                </div>
              ) : (
                <ul className="space-y-0.5">
                  {filtered.map((s) => {
                    const isActive = s.id === activeId;
                    const name = s.guest_name || s.guest_email?.split("@")[0] || "Anonymous";
                    const hasUnread = s.unread_admin > 0;
                    return (
                      <li key={s.id}>
                        <button
                          onClick={() => setActiveId(s.id)}
                          className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition ${
                            isActive ? "ops-tab-active" : "hover:bg-foreground/[0.04]"
                          }`}
                        >
                          <span className="ops-chip relative grid h-10 w-10 shrink-0 place-items-center rounded-full text-[12px] font-medium">
                            {initials(s.guest_name, s.guest_email)}
                            {s.status === "open" && (
                              <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-gc-green ring-2 ring-background" />
                            )}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="flex items-baseline justify-between gap-2">
                              <span className={`truncate text-[13.5px] ${hasUnread ? "font-semibold" : "font-medium"}`}>{name}</span>
                              <span className="shrink-0 text-[11.5px] tabular-nums text-muted-foreground">{timeAgo(s.last_message_at)}</span>
                            </span>
                            <span className="mt-0.5 flex items-center justify-between gap-2">
                              <span className="truncate text-[12.5px] text-muted-foreground">{s.guest_email || "No email"}</span>
                              {hasUnread && (
                                <span className="ops-count grid h-[18px] min-w-[18px] shrink-0 place-items-center rounded-full px-1.5 text-[10.5px] font-semibold tabular-nums">
                                  {s.unread_admin}
                                </span>
                              )}
                            </span>
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </aside>

          {/* Conversation */}
          <section className={`ops-card min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-2xl ${activeId ? "flex" : "hidden md:flex"}`}>
            {!activeSession ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center">
                <Inbox className="h-6 w-6 text-muted-foreground" />
                <p className="text-[14.5px] font-medium">Pick a conversation</p>
                <p className="max-w-xs text-[12.5px] leading-relaxed text-muted-foreground">
                  Shortcuts: <Kbd>J</Kbd> / <Kbd>K</Kbd> move, <Kbd>R</Kbd> reply, <Kbd>E</Kbd> close.
                </p>
              </div>
            ) : (
              <>
                <div className="ops-line flex min-h-16 shrink-0 items-center gap-3 border-b px-4 py-3 sm:px-5">
                  <button
                    onClick={() => setActiveId(null)}
                    className="ops-btn grid h-8 w-8 place-items-center rounded-full md:hidden"
                    aria-label="Back"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <span className="ops-chip grid h-10 w-10 shrink-0 place-items-center rounded-full text-[12px] font-medium">
                    {initials(activeSession.guest_name, activeSession.guest_email)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-[15px] font-medium">{activeSession.guest_name || "Visitor"}</span>
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium capitalize ${
                          activeSession.status === "open" ? "bg-gc-green-soft text-gc-success" : "ops-chip text-muted-foreground"
                        }`}
                      >
                        {activeSession.status}
                      </span>
                    </div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[12px] text-muted-foreground">
                      {activeSession.guest_email ? (
                        <button
                          onClick={() => copyEmail(activeSession.guest_email!)}
                          className="inline-flex items-center gap-1 truncate transition hover:text-foreground"
                          title="Copy email"
                        >
                          {activeSession.guest_email}
                          {copied ? <CheckCircle2 className="h-3 w-3 text-gc-success" /> : <Copy className="h-3 w-3" />}
                        </button>
                      ) : (
                        <span>No email</span>
                      )}
                      <span>·</span>
                      <span>Started {new Date(activeSession.created_at).toLocaleDateString()}</span>
                      <span className="hidden sm:inline">· {messages.length} messages</span>
                    </div>
                  </div>
                  {activeSession.status === "open" ? (
                    <button
                      onClick={handleClose}
                      className="ops-btn inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full px-4 text-[13px] font-medium"
                      title="Close (E)"
                    >
                      <Archive className="h-3.5 w-3.5" /> Close
                    </button>
                  ) : null}
                </div>

                <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto bg-background">
                  <div className="mx-auto max-w-3xl px-4 py-6 sm:px-8">
                    {messages.length === 0 && <div className="py-8 text-center text-[12.5px] text-muted-foreground">No messages yet</div>}
                    {messages.map((m, i) => {
                      const isAdminMsg = m.sender === "admin";
                      const prev = messages[i - 1];
                      const showHeader =
                        !prev || prev.sender !== m.sender || new Date(m.created_at).getTime() - new Date(prev.created_at).getTime() > 5 * 60 * 1000;
                      return (
                        <div key={m.id} className={showHeader ? "pt-5" : "pt-1"}>
                          {showHeader && (
                            <div className={`mb-1.5 flex items-center gap-2 text-[12px] text-muted-foreground ${isAdminMsg ? "justify-end" : ""}`}>
                              <span className="font-medium">{isAdminMsg ? username || "You" : activeSession.guest_name || "Visitor"}</span>
                              <span>{new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                            </div>
                          )}
                          <div className={`flex ${isAdminMsg ? "justify-end" : "justify-start"}`}>
                            <div
                              className={`max-w-[80%] whitespace-pre-wrap break-words rounded-2xl px-4 py-2.5 text-[14px] leading-relaxed ${
                                isAdminMsg ? "bg-foreground text-background" : "ops-card text-foreground"
                              }`}
                            >
                              {m.content}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <form onSubmit={handleReply} className="ops-line shrink-0 border-t bg-background p-3 sm:p-4">
                  {activeSession.status === "closed" ? (
                    <div className="flex items-center justify-center gap-2 py-2 text-[12.5px] text-muted-foreground">
                      <CheckCircle2 className="h-3.5 w-3.5" /> This conversation is closed
                    </div>
                  ) : (
                    <div className="mx-auto max-w-3xl">
                      <div className="ops-input rounded-2xl transition focus-within:ring-2 focus-within:ring-foreground/15">
                        <textarea
                          ref={inputRef}
                          value={input}
                          onChange={(e) => setInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                              e.preventDefault();
                              handleReply(e as unknown as React.FormEvent);
                            }
                          }}
                          placeholder="Write a reply… (Enter to send, Shift+Enter for a new line)"
                          rows={2}
                          maxLength={4000}
                          className="max-h-48 min-h-[56px] w-full resize-none bg-transparent px-4 py-3 text-[14px] leading-relaxed outline-none placeholder:text-muted-foreground"
                        />
                        <div className="flex items-center justify-between gap-2 px-2.5 pb-2.5">
                          <div className="relative">
                            <button
                              type="button"
                              onClick={() => setShowCanned((v) => !v)}
                              className="ops-btn inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[12.5px] font-medium"
                            >
                              <Zap className="h-3 w-3" /> Quick replies
                            </button>
                            {showCanned && (
                              <>
                                <button type="button" onClick={() => setShowCanned(false)} className="fixed inset-0 z-10 cursor-default" aria-label="Close" />
                                <div className="ops-card absolute bottom-full left-0 z-20 mb-2 w-80 overflow-hidden rounded-2xl bg-background shadow-lg">
                                  <ul className="max-h-64 overflow-y-auto p-1">
                                    {CANNED.map((c) => (
                                      <li key={c.key}>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setInput((prev) => (prev ? prev + "\n\n" + c.text : c.text));
                                            setShowCanned(false);
                                            inputRef.current?.focus();
                                          }}
                                          className="block w-full rounded-xl px-3 py-2 text-left transition hover:bg-foreground/[0.05]"
                                        >
                                          <div className="text-[13px] font-medium">{c.label}</div>
                                          <div className="mt-0.5 line-clamp-2 text-[12px] text-muted-foreground">{c.text}</div>
                                        </button>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              </>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="hidden text-[11.5px] tabular-nums text-muted-foreground sm:inline">{input.length}/4000</span>
                            <button
                              type="submit"
                              disabled={sending || !input.trim()}
                              aria-label="Send"
                              title="Send (Enter)"
                              className="inline-flex h-9 items-center gap-1.5 rounded-full bg-foreground px-4 text-[13px] font-medium text-background transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-3.5 w-3.5" />} Send
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </form>
              </>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

function Shortcut({ k, label }: { k: string; label: string }) {
  return (
    <li className="flex items-center justify-between">
      <span>{label}</span>
      <Kbd>{k}</Kbd>
    </li>
  );
}

function Kbd({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <kbd
      className={`inline-flex h-4 min-w-[16px] items-center justify-center rounded border border-gc-line bg-background px-1 font-mono text-[10px] font-medium text-gc-ink-muted ${className}`}
    >
      {children}
    </kbd>
  );
}

function Chip({
  children,
  tone,
  icon,
}: {
  children: React.ReactNode;
  tone: "emerald" | "zinc" | "blue" | "amber";
  icon?: React.ReactNode;
}) {
  const map: Record<string, string> = {
    emerald: "bg-gc-green-soft text-gc-success ring-gc-success/30",
    zinc: "bg-gc-panel text-gc-ink-muted ring-gc-line",
    blue: "bg-gc-sky text-gc-blue-deep ring-gc-blue-soft",
    amber: "bg-gc-yellow-soft text-gc-amber ring-gc-yellow",
  };
  return (
    <span
      className={`inline-flex items-center gap-1 rounded px-1.5 py-[1px] text-[10px] font-medium capitalize ring-1 ring-inset ${map[tone]}`}
    >
      {icon}
      {children}
    </span>
  );
}

function DetailRow({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-2">
      <span className="flex items-center gap-1.5 text-gc-ink-muted">
        {icon}
        {label}
      </span>
      <span className="min-w-0 truncate text-right font-medium text-gc-ink">{children}</span>
    </div>
  );
}
