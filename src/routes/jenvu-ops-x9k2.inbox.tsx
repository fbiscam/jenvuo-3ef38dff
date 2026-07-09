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
      <div className="grid min-h-screen place-items-center bg-zinc-50">
        <Loader2 className="h-5 w-5 animate-spin text-zinc-400" />
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
    <div className="flex h-screen flex-col bg-gradient-to-br from-indigo-50/40 via-white to-sky-50/30 text-[13px] text-zinc-900 antialiased [font-family:'Urbanist_Variable',Urbanist,system-ui,-apple-system,sans-serif] [font-feature-settings:'cv11','ss01','ss03'] [font-optical-sizing:auto]">
      {/* Top bar */}
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-indigo-100/70 bg-white/70 px-4 backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          <span className="grid h-8 w-8 place-items-center overflow-hidden rounded-lg bg-gradient-to-br from-indigo-50 to-sky-50 shadow-sm ring-1 ring-indigo-100">
            <img src="/favicon.png" alt="Jenvu" className="h-6 w-6 object-contain" />
          </span>
          <span className="bg-gradient-to-r from-indigo-600 via-violet-600 to-sky-600 bg-clip-text text-[16px] font-bold tracking-tight text-transparent">Jenvu</span>
          <span className="text-indigo-300">/</span>
          <span className="text-[13px] font-medium tracking-tight text-zinc-500">Support Inbox</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden items-center gap-1 rounded-md border border-zinc-200 bg-zinc-50 px-1.5 py-0.5 font-mono text-[10.5px] text-zinc-500 sm:inline-flex">
            <Command className="h-2.5 w-2.5" /> K
          </span>
          <span className="hidden text-[11.5px] text-zinc-500 sm:inline">{username}</span>
          <button
            onClick={handleLogout}
            className="grid h-7 w-7 place-items-center rounded-md text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900"
            title="Sign out"
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Left rail — filters/nav */}
        <nav className="hidden w-60 shrink-0 flex-col border-r border-indigo-100/70 bg-white/50 p-2.5 md:flex">
          <div className="mb-2 px-2 pt-1 text-[11px] font-semibold uppercase tracking-wider text-indigo-500/80">
            Inboxes
          </div>
          <ul className="space-y-1">
            {filters.map((f) => {
              const active = filter === f.key;
              return (
                <li key={f.key}>
                  <button
                    onClick={() => setFilter(f.key)}
                    className={`flex w-full items-center justify-between rounded-md px-2.5 py-2 text-[14px] transition ${
                      active
                        ? "bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-sm shadow-indigo-500/20"
                        : "text-zinc-700 hover:bg-indigo-50/60"
                    }`}
                  >
                    <span className="flex items-center gap-2.5">
                      <span className={active ? "text-white/80" : "text-zinc-400"}>{f.icon}</span>
                      {f.label}
                    </span>
                    <span
                      className={`tabular-nums text-[12px] ${
                        active ? "text-white/70" : "text-zinc-400"
                      }`}
                    >
                      {f.count}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>

          <div className="mb-2 mt-5 px-2 text-[11px] font-semibold uppercase tracking-wider text-indigo-500/80">
            Shortcuts
          </div>
          <ul className="space-y-1.5 px-2 text-[13px] text-zinc-600">
            <Shortcut k="J / K" label="Navigate" />
            <Shortcut k="R" label="Reply" />
            <Shortcut k="E" label="Close chat" />
            <Shortcut k="/" label="Search" />
          </ul>

          <div className="mt-auto rounded-lg border border-indigo-100 bg-gradient-to-br from-indigo-50/70 to-sky-50/70 p-3">
            <div className="flex items-center gap-1.5 text-[13px] font-medium text-indigo-900">
              <Zap className="h-3.5 w-3.5 text-amber-500" /> {counts.unreadMsgs} unread msgs
            </div>
            <div className="mt-0.5 text-[12px] text-indigo-700/70">across {counts.unread} threads</div>
          </div>
        </nav>

        {/* Middle — conversation list */}
        <aside
          className={`flex w-full shrink-0 flex-col border-r border-zinc-200 bg-white md:w-[340px] ${
            activeId ? "hidden md:flex" : "flex"
          }`}
        >
          <div className="flex h-11 items-center gap-2 border-b border-zinc-200 px-3">
            <Filter className="h-3.5 w-3.5 text-zinc-400" />
            <span className="text-[12px] font-semibold capitalize">{filter}</span>
            <span className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-[10.5px] tabular-nums text-zinc-600">
              {filtered.length}
            </span>
            <div className="ml-auto flex items-center gap-1">
              <div className="relative">
                <Search className="pointer-events-none absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-zinc-400" />
                <input
                  ref={searchRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search…"
                  className="h-7 w-40 rounded-md border border-zinc-200 bg-white pl-6 pr-2 text-[12px] placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900/5"
                />
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center px-6 py-10 text-center">
                <div className="grid h-10 w-10 place-items-center rounded-full bg-zinc-100">
                  <Inbox className="h-4 w-4 text-zinc-400" />
                </div>
                <p className="mt-2 text-[13px] font-medium text-zinc-800">No conversations</p>
                <p className="mt-1 text-[11.5px] text-zinc-500">
                  {filter === "open" ? "You're all caught up." : "Nothing matches this filter."}
                </p>
              </div>
            ) : (
              <ul>
                {filtered.map((s) => {
                  const isActive = s.id === activeId;
                  const name = s.guest_name || s.guest_email?.split("@")[0] || "Anonymous";
                  const hasUnread = s.unread_admin > 0;
                  return (
                    <li key={s.id}>
                      <button
                        onClick={() => setActiveId(s.id)}
                        className={`group relative flex w-full items-start gap-2.5 border-b border-zinc-100 px-3 py-2.5 text-left transition ${
                          isActive ? "bg-indigo-50/60" : "hover:bg-indigo-50/30"
                        }`}
                      >
                        {isActive && (
                          <span className="absolute inset-y-2 left-0 w-0.5 rounded-r bg-gradient-to-b from-indigo-500 to-violet-600" />
                        )}
                        {hasUnread && !isActive && (
                          <span className="absolute left-1 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-indigo-500" />
                        )}
                        <div className="relative mt-0.5 shrink-0">
                          <div className="grid h-7 w-7 place-items-center rounded-md bg-gradient-to-br from-indigo-500 to-violet-600 text-[10px] font-semibold text-white">
                            {initials(s.guest_name, s.guest_email)}
                          </div>
                          <span
                            className={`absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full ring-2 ring-white ${
                              s.status === "open" ? "bg-emerald-500" : "bg-zinc-300"
                            }`}
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-baseline justify-between gap-2">
                            <span
                              className={`truncate text-[12.5px] ${
                                hasUnread ? "font-semibold text-zinc-900" : "font-medium text-zinc-800"
                              }`}
                            >
                              {name}
                            </span>
                            <span className="shrink-0 font-mono text-[10px] tabular-nums text-zinc-400">
                              {timeAgo(s.last_message_at)}
                            </span>
                          </div>
                          <div className="mt-0.5 flex items-center justify-between gap-2">
                            <span className="truncate text-[11.5px] text-zinc-500">
                              {s.guest_email || "No email provided"}
                            </span>
                            {hasUnread && (
                              <span className="grid h-4 min-w-[16px] shrink-0 place-items-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 px-1 text-[10px] font-semibold text-white tabular-nums shadow-sm shadow-indigo-500/30">
                                {s.unread_admin}
                              </span>
                            )}
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-1">
                            <Chip
                              tone={s.status === "open" ? "emerald" : "zinc"}
                              icon={s.status === "open" ? <CircleDot className="h-2.5 w-2.5" /> : <Circle className="h-2.5 w-2.5" />}
                            >
                              {s.status}
                            </Chip>
                            <Chip tone="zinc" icon={<Hash className="h-2.5 w-2.5" />}>
                              {s.id.slice(0, 6)}
                            </Chip>
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

        {/* Right — conversation */}
        <section className={`flex flex-1 flex-col bg-white ${activeId ? "flex" : "hidden md:flex"}`}>
          {!activeSession ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center">
              <div className="grid h-12 w-12 place-items-center rounded-full bg-zinc-100">
                <Inbox className="h-5 w-5 text-zinc-400" />
              </div>
              <p className="text-[13px] font-medium text-zinc-800">Select a conversation</p>
              <p className="max-w-xs text-[11.5px] text-zinc-500">
                Use <Kbd>J</Kbd> / <Kbd>K</Kbd> to navigate, <Kbd>R</Kbd> to reply, <Kbd>E</Kbd> to close.
              </p>
            </div>
          ) : (
            <>
              {/* Thread header */}
              <div className="flex h-11 shrink-0 items-center gap-2 border-b border-zinc-200 px-3">
                <button
                  onClick={() => setActiveId(null)}
                  className="grid h-7 w-7 place-items-center rounded-md text-zinc-600 hover:bg-zinc-100 md:hidden"
                  aria-label="Back"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <div className="grid h-7 w-7 place-items-center rounded-md bg-gradient-to-br from-indigo-500 to-violet-600 text-[10px] font-semibold text-white">
                  {initials(activeSession.guest_name, activeSession.guest_email)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="truncate text-[13px] font-semibold">
                      {activeSession.guest_name || "Anonymous visitor"}
                    </span>
                    <Chip
                      tone={activeSession.status === "open" ? "emerald" : "zinc"}
                      icon={activeSession.status === "open" ? <CircleDot className="h-2.5 w-2.5" /> : <CheckCircle2 className="h-2.5 w-2.5" />}
                    >
                      {activeSession.status}
                    </Chip>
                  </div>
                  <div className="mt-0.5 flex items-center gap-2 text-[11px] text-zinc-500">
                    {activeSession.guest_email ? (
                      <button
                        onClick={() => copyEmail(activeSession.guest_email!)}
                        className="flex items-center gap-1 truncate transition hover:text-zinc-900"
                        title="Copy email"
                      >
                        <Mail className="h-3 w-3" />
                        <span className="truncate">{activeSession.guest_email}</span>
                        {copied ? (
                          <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                        ) : (
                          <Copy className="h-3 w-3 opacity-0 transition group-hover:opacity-100" />
                        )}
                      </button>
                    ) : (
                      <span className="flex items-center gap-1 text-zinc-400">
                        <Mail className="h-3 w-3" /> No email
                      </span>
                    )}
                    <span className="text-zinc-300">·</span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" /> {new Date(activeSession.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {activeSession.status === "open" ? (
                    <button
                      onClick={handleClose}
                      className="inline-flex items-center gap-1.5 rounded-md border border-zinc-200 px-2.5 py-1 text-[11.5px] font-medium text-zinc-700 transition hover:bg-zinc-50"
                      title="Close (E)"
                    >
                      <Archive className="h-3 w-3" /> Close
                      <Kbd className="ml-1">E</Kbd>
                    </button>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-md bg-zinc-100 px-2.5 py-1 text-[11.5px] font-medium text-zinc-600">
                      <CheckCircle2 className="h-3 w-3" /> Closed
                    </span>
                  )}
                </div>
              </div>

              {/* Messages */}
              <div ref={scrollRef} className="flex-1 overflow-y-auto bg-gradient-to-b from-indigo-50/30 via-white to-sky-50/20">
                <div className="mx-auto max-w-3xl space-y-1 p-4">
                  {messages.length === 0 && (
                    <div className="py-8 text-center text-[11.5px] text-zinc-500">No messages yet.</div>
                  )}
                  {messages.map((m, i) => {
                    const isAdminMsg = m.sender === "admin";
                    const prev = messages[i - 1];
                    const showHeader = !prev || prev.sender !== m.sender ||
                      new Date(m.created_at).getTime() - new Date(prev.created_at).getTime() > 5 * 60 * 1000;
                    return (
                      <div key={m.id} className={showHeader ? "pt-3" : ""}>
                        {showHeader && (
                          <div className={`mb-1 flex items-center gap-1.5 text-[10.5px] ${isAdminMsg ? "justify-end" : ""}`}>
                            <span className="font-semibold text-zinc-700">
                              {isAdminMsg ? username || "You" : activeSession.guest_name || "Visitor"}
                            </span>
                            <span className="text-zinc-400">
                              {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </span>
                          </div>
                        )}
                        <div className={`flex ${isAdminMsg ? "justify-end" : "justify-start"}`}>
                          <div
                            className={`max-w-[78%] whitespace-pre-wrap break-words rounded-lg px-3 py-2 text-[13px] leading-relaxed ${
                              isAdminMsg
                                ? "bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-sm shadow-indigo-500/20"
                                : "border border-indigo-100 bg-white text-zinc-900 shadow-sm"
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

              {/* Composer */}
              <form onSubmit={handleReply} className="shrink-0 border-t border-zinc-200 bg-white p-3">
                {activeSession.status === "closed" ? (
                  <div className="flex items-center justify-center gap-2 rounded-md bg-zinc-50 py-2.5 text-[11.5px] text-zinc-500">
                    <CheckCircle2 className="h-3.5 w-3.5" /> This conversation is closed.
                  </div>
                ) : (
                  <div className="mx-auto max-w-3xl">
                    <div className="relative rounded-lg border border-zinc-200 bg-white shadow-sm transition focus-within:border-zinc-400 focus-within:ring-2 focus-within:ring-zinc-900/10">
                      <textarea
                        ref={inputRef}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => {
                          if ((e.key === "Enter" && (e.metaKey || e.ctrlKey)) || (e.key === "Enter" && !e.shiftKey)) {
                            e.preventDefault();
                            handleReply(e as unknown as React.FormEvent);
                          }
                        }}
                        placeholder="Reply to visitor…  (Enter to send, Shift+Enter for newline)"
                        rows={2}
                        maxLength={4000}
                        className="max-h-48 min-h-[56px] w-full resize-none bg-transparent px-3 py-2.5 text-[13px] outline-none placeholder:text-zinc-400"
                      />
                      <div className="flex items-center justify-between gap-2 border-t border-zinc-100 px-2 py-1.5">
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => setShowCanned((v) => !v)}
                            className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11.5px] font-medium text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
                          >
                            <Zap className="h-3 w-3" /> Canned
                          </button>
                          {showCanned && (
                            <>
                              <button
                                type="button"
                                onClick={() => setShowCanned(false)}
                                className="fixed inset-0 z-10 cursor-default"
                                aria-label="Close"
                              />
                              <div className="absolute bottom-full left-0 z-20 mb-1 w-72 overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-lg">
                                <div className="border-b border-zinc-100 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                                  Quick replies
                                </div>
                                <ul className="max-h-64 overflow-y-auto py-1">
                                  {CANNED.map((c) => (
                                    <li key={c.key}>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setInput((prev) => (prev ? prev + "\n\n" + c.text : c.text));
                                          setShowCanned(false);
                                          inputRef.current?.focus();
                                        }}
                                        className="block w-full px-3 py-2 text-left transition hover:bg-zinc-50"
                                      >
                                        <div className="text-[12px] font-medium text-zinc-800">{c.label}</div>
                                        <div className="mt-0.5 line-clamp-2 text-[11px] text-zinc-500">{c.text}</div>
                                      </button>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            </>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="hidden font-mono text-[10.5px] text-zinc-400 sm:inline">
                            {input.length}/4000
                          </span>
                          <button
                            type="submit"
                            disabled={sending || !input.trim()}
                            className="inline-flex h-7 items-center gap-1.5 rounded-md bg-zinc-900 px-2.5 text-[12px] font-medium text-white shadow-sm transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            {sending ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Send className="h-3.5 w-3.5" />
                            )}
                            Send
                            <span className="ml-1 inline-flex items-center gap-0.5 rounded bg-white/15 px-1 font-mono text-[10px] text-white/70">
                              <CornerDownLeft className="h-2.5 w-2.5" />
                            </span>
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

        {/* Details rail */}
        {activeSession && (
          <aside className="hidden w-64 shrink-0 flex-col border-l border-zinc-200 bg-white/60 p-4 xl:flex">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
              Visitor
            </div>
            <div className="mt-2 flex items-center gap-2.5">
              <div className="grid h-10 w-10 place-items-center rounded-lg bg-gradient-to-br from-zinc-700 to-zinc-900 text-[12px] font-semibold text-white">
                {initials(activeSession.guest_name, activeSession.guest_email)}
              </div>
              <div className="min-w-0">
                <div className="truncate text-[13px] font-semibold">
                  {activeSession.guest_name || "Anonymous"}
                </div>
                <div className="truncate text-[11px] text-zinc-500">
                  {activeSession.guest_email || "No email"}
                </div>
              </div>
            </div>

            <div className="mt-5 space-y-2.5 text-[11.5px]">
              <DetailRow icon={<UserIcon className="h-3 w-3" />} label="Name">
                {activeSession.guest_name || "—"}
              </DetailRow>
              <DetailRow icon={<Mail className="h-3 w-3" />} label="Email">
                {activeSession.guest_email || "—"}
              </DetailRow>
              <DetailRow icon={<Hash className="h-3 w-3" />} label="Session">
                <span className="font-mono text-[10.5px]">{activeSession.id.slice(0, 8)}</span>
              </DetailRow>
              <DetailRow icon={<Calendar className="h-3 w-3" />} label="Started">
                {new Date(activeSession.created_at).toLocaleString()}
              </DetailRow>
              <DetailRow icon={<CircleDot className="h-3 w-3" />} label="Status">
                <span className="capitalize">{activeSession.status}</span>
              </DetailRow>
            </div>

            <div className="mt-6 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
              Activity
            </div>
            <div className="mt-2 rounded-lg border border-zinc-200 bg-white p-2.5 text-[11.5px]">
              <div className="flex items-center justify-between">
                <span className="text-zinc-500">Messages</span>
                <span className="font-mono tabular-nums font-semibold text-zinc-900">
                  {messages.length}
                </span>
              </div>
              <div className="mt-1.5 flex items-center justify-between">
                <span className="text-zinc-500">Last reply</span>
                <span className="font-mono tabular-nums text-zinc-700">
                  {timeAgo(activeSession.last_message_at)} ago
                </span>
              </div>
            </div>
          </aside>
        )}
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
      className={`inline-flex h-4 min-w-[16px] items-center justify-center rounded border border-zinc-200 bg-white px-1 font-mono text-[10px] font-medium text-zinc-600 shadow-[0_1px_0_rgba(0,0,0,0.04)] ${className}`}
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
    emerald: "bg-emerald-50 text-emerald-700 ring-emerald-200/60",
    zinc: "bg-zinc-100 text-zinc-600 ring-zinc-200/60",
    blue: "bg-blue-50 text-blue-700 ring-blue-200/60",
    amber: "bg-amber-50 text-amber-700 ring-amber-200/60",
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
      <span className="flex items-center gap-1.5 text-zinc-500">
        {icon}
        {label}
      </span>
      <span className="min-w-0 truncate text-right font-medium text-zinc-800">{children}</span>
    </div>
  );
}
