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
  Sparkles,
  TrendingUp,
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

// Deterministic pastel gradient per contact for a colorful, personal avatar system
function avatarGradient(seed: string) {
  const palettes = [
    "from-sky-400 to-indigo-500",
    "from-violet-400 to-fuchsia-500",
    "from-emerald-400 to-teal-500",
    "from-amber-400 to-orange-500",
    "from-rose-400 to-pink-500",
    "from-cyan-400 to-blue-500",
    "from-lime-400 to-emerald-500",
    "from-purple-400 to-indigo-500",
  ];
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return palettes[hash % palettes.length];
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
      <div className="grid min-h-screen place-items-center bg-[#fafbfc]">
        <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#fafbfc] font-sans text-slate-900">
      {/* Ambient background flourish */}
      <div className="pointer-events-none absolute inset-0 -z-0">
        <div className="absolute -top-40 -left-40 h-[520px] w-[520px] rounded-full bg-gradient-to-br from-sky-200/60 via-indigo-200/40 to-transparent blur-3xl" />
        <div className="absolute -bottom-40 -right-40 h-[520px] w-[520px] rounded-full bg-gradient-to-tr from-violet-200/50 via-fuchsia-200/30 to-transparent blur-3xl" />
      </div>

      {/* Top bar */}
      <div className="relative z-10 border-b border-slate-200/70 bg-white/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between px-4 py-4 sm:px-8">
          <div className="flex items-center gap-3">
            <span className="relative grid h-10 w-10 place-items-center overflow-hidden rounded-2xl bg-white shadow-[0_2px_10px_rgba(59,130,246,0.15)] ring-1 ring-slate-200">
              <img src="/favicon.png" alt="Jenvu" className="h-6 w-6 object-contain" />
              <span className="absolute -bottom-1 -right-1 h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-white" />
            </span>
            <div>
              <div className="flex items-baseline gap-2">
                <span className="font-display text-[22px] font-semibold leading-none tracking-tight text-slate-900">
                  Support
                </span>
                <span className="font-display text-[22px] font-light leading-none tracking-tight text-slate-400">
                  Inbox
                </span>
              </div>
              <div className="mt-1.5 flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] text-slate-500">
                <span className="inline-block h-1 w-1 rounded-full bg-emerald-500" />
                <span>Live</span>
                <span className="text-slate-300">·</span>
                <span className="font-semibold text-slate-700">{username}</span>
              </div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="group flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 hover:shadow"
          >
            <LogOut className="h-3.5 w-3.5 transition group-hover:-translate-x-0.5" /> Sign out
          </button>
        </div>
      </div>

      <div className="relative z-10 mx-auto flex h-[calc(100vh-4.75rem)] max-w-[1440px] flex-col gap-5 p-4 sm:p-6">
        {/* Hero + stats */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-sky-700">
              <Sparkles className="h-3 w-3" /> Command center
            </div>
            <h1 className="font-display mt-2 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
              Every conversation, <span className="italic text-slate-400">in one place.</span>
            </h1>
            <p className="mt-1 max-w-md text-sm text-slate-500">
              Reply to visitors from live chat and contact form submissions — all in real time.
            </p>
          </div>
          <div className="grid w-full grid-cols-3 gap-3 sm:w-auto">
            <StatCard label="Open" value={stats.open} tone="emerald" icon={<Inbox className="h-4 w-4" />} />
            <StatCard label="Unread" value={stats.unread} tone="rose" icon={<Mail className="h-4 w-4" />} pulse={stats.unread > 0} />
            <StatCard label="Total" value={stats.total} tone="slate" icon={<TrendingUp className="h-4 w-4" />} />
          </div>
        </div>

        {/* Split-screen workspace */}
        <div className="flex flex-1 overflow-hidden rounded-3xl border border-slate-200 bg-white/70 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_20px_50px_-20px_rgba(15,23,42,0.15)] backdrop-blur-xl">
          {/* Sidebar */}
          <aside
            className={`flex w-full flex-col border-r border-slate-200/70 sm:w-[340px] ${activeId ? "hidden sm:flex" : "flex"}`}
          >
            <div className="border-b border-slate-200/70 bg-white/60 p-3">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search name or email…"
                  className="w-full rounded-full border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm placeholder:text-slate-400 focus:border-sky-400 focus:outline-none focus:ring-4 focus:ring-sky-100"
                />
              </div>
              <div className="mt-2.5 flex items-center gap-1.5">
                <Filter className="ml-0.5 h-3 w-3 text-slate-400" />
                <div className="flex flex-1 gap-1 rounded-full bg-slate-100/80 p-1 text-xs">
                  {(["open", "closed", "all"] as const).map((k) => (
                    <button
                      key={k}
                      onClick={() => setFilter(k)}
                      className={`flex-1 rounded-full px-2 py-1 capitalize transition ${
                        filter === k
                          ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-200"
                          : "text-slate-600 hover:text-slate-900"
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
                  <div className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-sky-50 to-indigo-50 ring-1 ring-sky-100">
                    <Inbox className="h-6 w-6 text-sky-500" />
                  </div>
                  <p className="font-display mt-3 text-base font-medium text-slate-800">All clear</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {filter === "open" ? "You're all caught up." : "Nothing matches this filter."}
                  </p>
                </div>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {filtered.map((s) => {
                    const isActive = s.id === activeId;
                    const name = s.guest_name || s.guest_email?.split("@")[0] || "Anonymous";
                    const seed = s.guest_email || s.guest_name || s.id;
                    return (
                      <li key={s.id}>
                        <button
                          onClick={() => setActiveId(s.id)}
                          className={`relative flex w-full items-start gap-3 px-4 py-3.5 text-left transition ${
                            isActive
                              ? "bg-gradient-to-r from-sky-50/70 to-transparent"
                              : "hover:bg-slate-50/70"
                          }`}
                        >
                          {isActive && (
                            <span className="absolute inset-y-2 left-0 w-1 rounded-r-full bg-gradient-to-b from-sky-500 to-indigo-500" />
                          )}
                          <div className="relative shrink-0">
                            <div
                              className={`grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br ${avatarGradient(seed)} text-[11px] font-semibold text-white shadow-sm ring-2 ring-white`}
                            >
                              {initials(s.guest_name, s.guest_email)}
                            </div>
                            <span
                              className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full ring-2 ring-white ${
                                s.status === "open" ? "bg-emerald-500" : "bg-slate-300"
                              }`}
                            />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex min-w-0 items-center gap-1.5">
                                <span className="truncate text-sm font-semibold text-slate-900">{name}</span>
                                <SourceBadge source={s.source} />
                              </div>
                              <span className="shrink-0 text-[10px] font-medium text-slate-400">
                                {timeAgo(s.last_message_at)}
                              </span>
                            </div>
                            <div className="mt-1 flex items-center justify-between gap-2">
                              <span className="truncate text-xs text-slate-500">{s.guest_email || "No email"}</span>
                              {s.unread_admin > 0 && (
                                <span className="grid h-5 min-w-[20px] shrink-0 place-items-center rounded-full bg-gradient-to-br from-rose-500 to-pink-600 px-1.5 text-[10px] font-semibold text-white shadow-sm shadow-rose-500/30">
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
            className={`flex flex-1 flex-col bg-gradient-to-br from-white to-slate-50/50 ${activeId ? "flex" : "hidden sm:flex"}`}
          >
            {!activeSession ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
                <div className="relative">
                  <div className="absolute inset-0 -m-4 rounded-full bg-gradient-to-br from-sky-200/40 to-indigo-200/40 blur-2xl" />
                  <div className="relative grid h-20 w-20 place-items-center rounded-3xl bg-white ring-1 ring-slate-200 shadow-lg">
                    <MessageSquare className="h-8 w-8 text-sky-500" />
                  </div>
                </div>
                <div>
                  <p className="font-display text-2xl font-semibold tracking-tight text-slate-900">
                    Pick a conversation
                  </p>
                  <p className="mx-auto mt-1.5 max-w-xs text-sm leading-relaxed text-slate-500">
                    Select a thread from the left to read messages and reply to your visitor.
                  </p>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3 border-b border-slate-200/70 bg-white/80 px-5 py-4 backdrop-blur">
                  <button
                    onClick={() => setActiveId(null)}
                    className="grid h-9 w-9 place-items-center rounded-full text-slate-600 hover:bg-slate-100 sm:hidden"
                    aria-label="Back"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <div
                    className={`grid h-11 w-11 place-items-center rounded-full bg-gradient-to-br ${avatarGradient(activeSession.guest_email || activeSession.guest_name || activeSession.id)} text-xs font-semibold text-white shadow-sm ring-2 ring-white`}
                  >
                    {initials(activeSession.guest_name, activeSession.guest_email)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-display truncate text-base font-semibold text-slate-900">
                        {activeSession.guest_name || "Anonymous visitor"}
                      </span>
                      <SourceBadge source={activeSession.source} />
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                          activeSession.status === "open"
                            ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                            : "bg-slate-100 text-slate-600 ring-1 ring-slate-200"
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            activeSession.status === "open" ? "bg-emerald-500 animate-pulse" : "bg-slate-400"
                          }`}
                        />
                        {activeSession.status}
                      </span>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500">
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
                      className="hidden items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 sm:inline-flex"
                    >
                      <X className="h-3.5 w-3.5" /> Close
                    </button>
                  ) : (
                    <span className="hidden items-center gap-1 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600 ring-1 ring-slate-200 sm:inline-flex">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Closed
                    </span>
                  )}
                </div>

                <div
                  ref={scrollRef}
                  className="flex-1 space-y-3 overflow-y-auto bg-[radial-gradient(circle_at_1px_1px,rgba(15,23,42,0.05)_1px,transparent_0)] bg-[length:20px_20px] p-5"
                >
                  {messages.length === 0 && (
                    <div className="py-8 text-center text-xs text-slate-500">No messages yet.</div>
                  )}
                  {messages.map((m, i) => {
                    const isAdminMsg = m.sender === "admin";
                    const prev = messages[i - 1];
                    const showAvatar = !prev || prev.sender !== m.sender;
                    return (
                      <div
                        key={m.id}
                        className={`flex items-end gap-2 ${isAdminMsg ? "justify-end" : "justify-start"}`}
                      >
                        {!isAdminMsg && (
                          <div className={`h-8 w-8 shrink-0 ${showAvatar ? "" : "invisible"}`}>
                            <div
                              className={`grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br ${avatarGradient(activeSession.guest_email || activeSession.guest_name || activeSession.id)} text-[10px] font-semibold text-white shadow-sm ring-2 ring-white`}
                            >
                              {initials(activeSession.guest_name, activeSession.guest_email)}
                            </div>
                          </div>
                        )}
                        <div
                          className={`max-w-[75%] whitespace-pre-wrap break-words rounded-2xl px-4 py-2.5 text-sm shadow-sm ${
                            isAdminMsg
                              ? "rounded-br-sm bg-gradient-to-br from-sky-500 to-indigo-600 text-white shadow-sky-500/20"
                              : "rounded-bl-sm bg-white text-slate-900 ring-1 ring-slate-200"
                          }`}
                        >
                          {m.content}
                          <div
                            className={`mt-1 text-[10px] ${isAdminMsg ? "text-sky-100/80" : "text-slate-400"}`}
                          >
                            {new Date(m.created_at).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </div>
                        </div>
                        {isAdminMsg && (
                          <div className={`h-8 w-8 shrink-0 ${showAvatar ? "" : "invisible"}`}>
                            <div className="grid h-8 w-8 place-items-center rounded-full bg-slate-900 text-[10px] font-semibold text-white shadow-sm ring-2 ring-white">
                              J
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {activeSession.source === "form" ? (
                  <div className="flex items-center justify-between gap-2 border-t border-slate-200/70 bg-white/80 p-4 backdrop-blur">
                    <div className="text-xs text-slate-500">
                      Contact form submission — reply directly via email.
                    </div>
                    {activeSession.guest_email && (
                      <a
                        href={`mailto:${activeSession.guest_email}${
                          activeSession.subject
                            ? `?subject=${encodeURIComponent("Re: " + activeSession.subject)}`
                            : ""
                        }`}
                        className="flex h-10 items-center gap-2 rounded-full bg-gradient-to-br from-sky-500 to-indigo-600 px-4 text-sm font-medium text-white shadow-md shadow-sky-500/25 transition hover:shadow-lg hover:shadow-sky-500/30"
                      >
                        <Mail className="h-4 w-4" />
                        <span>Reply via email</span>
                      </a>
                    )}
                  </div>
                ) : (
                  <form onSubmit={handleReply} className="border-t border-slate-200/70 bg-white/80 p-3 backdrop-blur">
                    {activeSession.status === "closed" ? (
                      <div className="flex items-center justify-center gap-2 rounded-full bg-slate-50 py-3 text-xs text-slate-500 ring-1 ring-slate-200">
                        <CheckCircle2 className="h-3.5 w-3.5" /> This conversation is closed.
                      </div>
                    ) : (
                      <div className="flex items-end gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm transition focus-within:border-sky-400 focus-within:ring-4 focus-within:ring-sky-100">
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
                          className="max-h-40 min-h-[38px] flex-1 resize-none bg-transparent px-2 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400"
                        />
                        <button
                          type="submit"
                          disabled={sending || !input.trim()}
                          className="flex h-10 items-center gap-2 rounded-full bg-gradient-to-br from-sky-500 to-indigo-600 px-4 text-sm font-medium text-white shadow-md shadow-sky-500/25 transition hover:shadow-lg hover:shadow-sky-500/30 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
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
  tone,
  pulse,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  tone: "emerald" | "rose" | "slate";
  pulse?: boolean;
}) {
  const tones = {
    emerald: {
      ring: "ring-emerald-100",
      icon: "bg-emerald-50 text-emerald-600",
      dot: "bg-emerald-500",
      shadow: "shadow-emerald-500/5",
    },
    rose: {
      ring: "ring-rose-100",
      icon: "bg-rose-50 text-rose-600",
      dot: "bg-rose-500",
      shadow: "shadow-rose-500/5",
    },
    slate: {
      ring: "ring-slate-100",
      icon: "bg-slate-50 text-slate-600",
      dot: "bg-slate-400",
      shadow: "shadow-slate-500/5",
    },
  }[tone];

  return (
    <div
      className={`group relative overflow-hidden rounded-2xl border border-slate-200/70 bg-white/80 px-4 py-3 shadow-sm ${tones.shadow} ring-1 ${tones.ring} backdrop-blur-sm transition hover:-translate-y-0.5 hover:shadow-md`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className={`grid h-9 w-9 place-items-center rounded-xl ${tones.icon}`}>{icon}</span>
          <div className="flex flex-col">
            <span className="text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              {label}
            </span>
            <span className="mt-0.5 flex items-center gap-1 text-[10px] text-slate-400">
              <span
                className={`inline-block h-1.5 w-1.5 rounded-full ${tones.dot} ${pulse ? "animate-pulse" : ""}`}
              />
              live
            </span>
          </div>
        </div>
        <div className="font-display text-3xl font-semibold leading-none tracking-tight text-slate-900 tabular-nums">
          {value}
        </div>
      </div>
    </div>
  );
}

function SourceBadge({ source }: { source: "chat" | "form" }) {
  if (source === "form") {
    return (
      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-amber-700 ring-1 ring-amber-200">
        <Mail className="h-2.5 w-2.5" /> Form
      </span>
    );
  }
  return (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-sky-50 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-sky-700 ring-1 ring-sky-200">
      <MessageSquare className="h-2.5 w-2.5" /> Live chat
    </span>
  );
}
