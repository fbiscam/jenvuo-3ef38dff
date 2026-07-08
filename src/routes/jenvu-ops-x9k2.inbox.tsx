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
  Users,
  Mail,
  Clock,
  ChevronLeft,
  LogOut,
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

  // Gate check
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

  // Initial + polling
  useEffect(() => {
    if (!ready) return;
    loadSessions();
    const id = setInterval(loadSessions, 4000);
    return () => clearInterval(id);
  }, [ready, loadSessions]);

  // Active session messages + polling
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
      <div className="grid min-h-screen place-items-center bg-zinc-50">
        <Loader2 className="h-5 w-5 animate-spin text-zinc-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      {/* Top bar */}
      <div className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-white ring-1 ring-zinc-200 overflow-hidden">
              <img src="/favicon.png" alt="Jenvu" className="h-6 w-6 object-contain" />
            </span>
            <div>
              <div className="text-sm font-semibold text-zinc-900">Support Inbox</div>
              <div className="text-[10px] text-zinc-500">
                Signed in as <span className="font-medium text-zinc-700">{username}</span>
              </div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 rounded-md border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
          >
            <LogOut className="h-3.5 w-3.5" /> Sign out
          </button>
        </div>
      </div>

      <div className="mx-auto flex h-[calc(100vh-4rem)] max-w-[1400px] flex-col gap-4 p-4 sm:p-6">
        <div className="grid grid-cols-3 gap-2 sm:max-w-md sm:gap-3">
          <StatCard icon={<Inbox className="h-3.5 w-3.5" />} label="Open" value={stats.open} accent="text-emerald-600" />
          <StatCard icon={<Mail className="h-3.5 w-3.5" />} label="Unread" value={stats.unread} accent="text-red-600" />
          <StatCard icon={<Users className="h-3.5 w-3.5" />} label="Total" value={stats.total} accent="text-zinc-700" />
        </div>

        <div className="flex flex-1 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
          {/* Sidebar */}
          <aside
            className={`flex w-full flex-col border-r border-zinc-200 sm:w-80 ${activeId ? "hidden sm:flex" : "flex"}`}
          >
            <div className="border-b border-zinc-200 p-3">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search name or email…"
                  className="w-full rounded-md border border-zinc-200 bg-zinc-50 py-2 pl-9 pr-3 text-sm placeholder:text-zinc-400 focus:border-zinc-400 focus:bg-white focus:outline-none"
                />
              </div>
              <div className="mt-2 flex gap-1 rounded-md bg-zinc-100 p-1 text-xs">
                {(["open", "closed", "all"] as const).map((k) => (
                  <button
                    key={k}
                    onClick={() => setFilter(k)}
                    className={`flex-1 rounded px-2 py-1 capitalize transition ${
                      filter === k ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-600 hover:text-zinc-900"
                    }`}
                  >
                    {k}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {filtered.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center px-6 py-10 text-center">
                  <Inbox className="h-8 w-8 text-zinc-300" />
                  <p className="mt-2 text-sm font-medium text-zinc-700">No conversations</p>
                  <p className="mt-1 text-xs text-zinc-500">
                    {filter === "open" ? "You're all caught up." : "Nothing matches this filter."}
                  </p>
                </div>
              ) : (
                filtered.map((s) => {
                  const isActive = s.id === activeId;
                  const name = s.guest_name || s.guest_email?.split("@")[0] || "Anonymous";
                  return (
                    <button
                      key={s.id}
                      onClick={() => setActiveId(s.id)}
                      className={`flex w-full items-start gap-3 border-b border-zinc-100 px-3 py-3 text-left transition ${
                        isActive ? "bg-zinc-50" : "hover:bg-zinc-50/60"
                      }`}
                    >
                      <div className="relative shrink-0">
                        <div className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-zinc-800 to-zinc-600 text-[11px] font-semibold text-white">
                          {initials(s.guest_name, s.guest_email)}
                        </div>
                        <span
                          className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-white ${
                            s.status === "open" ? "bg-emerald-500" : "bg-zinc-300"
                          }`}
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex min-w-0 items-center gap-1.5">
                            <span className="truncate text-sm font-medium text-zinc-900">{name}</span>
                            <SourceBadge source={s.source} />
                          </div>
                          <span className="shrink-0 text-[10px] text-zinc-400">{timeAgo(s.last_message_at)}</span>
                        </div>
                        <div className="mt-0.5 flex items-center justify-between gap-2">
                          <span className="truncate text-xs text-zinc-500">{s.guest_email || "No email"}</span>
                          {s.unread_admin > 0 && (
                            <span className="grid h-4 min-w-4 shrink-0 place-items-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
                              {s.unread_admin}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </aside>

          {/* Conversation */}
          <section className={`flex flex-1 flex-col ${activeId ? "flex" : "hidden sm:flex"}`}>
            {!activeSession ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center">
                <div className="grid h-14 w-14 place-items-center rounded-full bg-zinc-100">
                  <MessageSquare className="h-6 w-6 text-zinc-400" />
                </div>
                <p className="text-sm font-medium text-zinc-800">Select a conversation</p>
                <p className="max-w-xs text-xs text-zinc-500">
                  Pick a chat from the left to view messages and reply to your visitor.
                </p>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3 border-b border-zinc-200 bg-white px-4 py-3">
                  <button
                    onClick={() => setActiveId(null)}
                    className="grid h-8 w-8 place-items-center rounded-md text-zinc-600 hover:bg-zinc-100 sm:hidden"
                    aria-label="Back"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <div className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-zinc-800 to-zinc-600 text-xs font-semibold text-white">
                    {initials(activeSession.guest_name, activeSession.guest_email)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-semibold text-zinc-900">
                        {activeSession.guest_name || "Anonymous visitor"}
                      </span>
                      <SourceBadge source={activeSession.source} />
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                          activeSession.status === "open"
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-zinc-100 text-zinc-600"
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            activeSession.status === "open" ? "bg-emerald-500" : "bg-zinc-400"
                          }`}
                        />
                        {activeSession.status}
                      </span>
                    </div>
                    <div className="mt-0.5 flex items-center gap-3 text-[11px] text-zinc-500">
                      {activeSession.guest_email && (
                        <span className="flex items-center gap-1 truncate">
                          <Mail className="h-3 w-3" /> {activeSession.guest_email}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" /> Started {new Date(activeSession.created_at).toLocaleString()}
                      </span>
                    </div>
                  </div>
                  {activeSession.status === "open" ? (
                    <button
                      onClick={handleClose}
                      className="hidden items-center gap-1 rounded-md border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-700 transition hover:bg-zinc-50 sm:inline-flex"
                    >
                      <X className="h-3.5 w-3.5" /> Close chat
                    </button>
                  ) : (
                    <span className="hidden items-center gap-1 rounded-md bg-zinc-100 px-3 py-1.5 text-xs font-medium text-zinc-600 sm:inline-flex">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Closed
                    </span>
                  )}
                </div>

                <div
                  ref={scrollRef}
                  className="flex-1 space-y-3 overflow-y-auto bg-[radial-gradient(circle_at_1px_1px,rgba(0,0,0,0.04)_1px,transparent_0)] bg-[length:16px_16px] bg-zinc-50 p-4"
                >
                  {messages.length === 0 && (
                    <div className="py-8 text-center text-xs text-zinc-500">No messages yet.</div>
                  )}
                  {messages.map((m, i) => {
                    const isAdminMsg = m.sender === "admin";
                    const prev = messages[i - 1];
                    const showAvatar = !prev || prev.sender !== m.sender;
                    return (
                      <div key={m.id} className={`flex items-end gap-2 ${isAdminMsg ? "justify-end" : "justify-start"}`}>
                        {!isAdminMsg && (
                          <div className={`h-7 w-7 shrink-0 ${showAvatar ? "" : "invisible"}`}>
                            <div className="grid h-7 w-7 place-items-center rounded-full bg-gradient-to-br from-zinc-700 to-zinc-500 text-[10px] font-semibold text-white">
                              {initials(activeSession.guest_name, activeSession.guest_email)}
                            </div>
                          </div>
                        )}
                        <div
                          className={`max-w-[75%] whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2 text-sm shadow-sm ${
                            isAdminMsg
                              ? "rounded-br-sm bg-zinc-900 text-white"
                              : "rounded-bl-sm bg-white text-zinc-900 ring-1 ring-zinc-200"
                          }`}
                        >
                          {m.content}
                          <div className="mt-1 text-[9px] text-zinc-400">
                            {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </div>
                        </div>
                        {isAdminMsg && (
                          <div className={`h-7 w-7 shrink-0 ${showAvatar ? "" : "invisible"}`}>
                            <div className="grid h-7 w-7 place-items-center rounded-full bg-zinc-900 text-[10px] font-semibold text-white">
                              J
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {activeSession.source === "form" ? (
                  <div className="flex items-center justify-between gap-2 border-t border-zinc-200 bg-white p-3">
                    <div className="text-xs text-zinc-500">
                      Contact form submission — reply directly via email.
                    </div>
                    {activeSession.guest_email && (
                      <a
                        href={`mailto:${activeSession.guest_email}${
                          activeSession.subject ? `?subject=${encodeURIComponent("Re: " + activeSession.subject)}` : ""
                        }`}
                        className="flex h-9 items-center gap-2 rounded-md bg-zinc-900 px-3.5 text-sm font-medium text-white transition hover:bg-zinc-800"
                      >
                        <Mail className="h-4 w-4" />
                        <span>Reply via email</span>
                      </a>
                    )}
                  </div>
                ) : (
                  <form onSubmit={handleReply} className="border-t border-zinc-200 bg-white p-3">
                    {activeSession.status === "closed" ? (
                      <div className="flex items-center justify-center gap-2 rounded-md bg-zinc-50 py-3 text-xs text-zinc-500">
                        <CheckCircle2 className="h-3.5 w-3.5" /> This conversation is closed.
                      </div>
                    ) : (
                      <div className="flex items-end gap-2 rounded-lg border border-zinc-200 bg-white p-2 focus-within:border-zinc-400">
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
                          className="max-h-40 min-h-[36px] flex-1 resize-none bg-transparent px-2 py-1.5 text-sm text-zinc-900 outline-none placeholder:text-zinc-400"
                        />
                        <button
                          type="submit"
                          disabled={sending || !input.trim()}
                          className="flex h-9 items-center gap-2 rounded-md bg-zinc-900 px-3.5 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40"
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
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  accent: string;
}) {
  return (
    <div className="flex min-w-[92px] items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2">
      <span className={`grid h-6 w-6 place-items-center rounded-md bg-zinc-50 ${accent}`}>{icon}</span>
      <div className="leading-tight">
        <div className="text-[10px] uppercase tracking-wide text-zinc-500">{label}</div>
        <div className="text-sm font-semibold text-zinc-900">{value}</div>
      </div>
    </div>
  );
}
