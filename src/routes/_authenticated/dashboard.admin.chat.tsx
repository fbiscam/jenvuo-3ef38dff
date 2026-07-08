import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { MessageSquare, Send, Loader2, X, Circle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { isAdmin } from "@/lib/admin-messages.functions";

export const Route = createFileRoute("/_authenticated/dashboard/admin/chat")({
  head: () => ({
    meta: [
      { title: "Live Chat — Jenvu Admin" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminChatPage,
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

function AdminChatPage() {
  const checkAdmin = useServerFn(isAdmin);
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [filter, setFilter] = useState<"open" | "closed" | "all">("open");
  const scrollRef = useRef<HTMLDivElement>(null);

  // Admin gate
  useEffect(() => {
    checkAdmin().then((r) => setAllowed(r.admin)).catch(() => setAllowed(false));
  }, [checkAdmin]);

  const loadSessions = useCallback(async () => {
    const { data, error } = await supabase
      .from("chat_sessions")
      .select("id,guest_name,guest_email,status,last_message_at,unread_admin,created_at")
      .order("last_message_at", { ascending: false })
      .limit(200);
    if (!error && data) setSessions(data as Session[]);
  }, []);

  const loadMessages = useCallback(async (sid: string) => {
    const { data, error } = await supabase
      .from("chat_messages")
      .select("id,sender,content,created_at")
      .eq("session_id", sid)
      .order("created_at", { ascending: true });
    if (!error && data) setMessages(data as Message[]);
  }, []);

  // Initial load + realtime
  useEffect(() => {
    if (!allowed) return;
    loadSessions();

    const chan = supabase
      .channel("admin_chat_realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "chat_sessions" },
        () => loadSessions(),
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages" },
        (payload) => {
          const row = payload.new as Message & { session_id: string };
          if (row.session_id === activeId) {
            setMessages((m) => [...m, { id: row.id, sender: row.sender, content: row.content, created_at: row.created_at }]);
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(chan);
    };
  }, [allowed, activeId, loadSessions]);

  // Load messages when active session changes
  useEffect(() => {
    if (!activeId) return;
    loadMessages(activeId);
    supabase.rpc("mark_chat_read", { _session_id: activeId }).then(() => loadSessions());
  }, [activeId, loadMessages, loadSessions]);

  // Auto scroll
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const filtered = useMemo(() => {
    if (filter === "all") return sessions;
    return sessions.filter((s) => s.status === filter);
  }, [sessions, filter]);

  const activeSession = sessions.find((s) => s.id === activeId) ?? null;

  const sendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    const content = input.trim();
    if (!content || !activeId || sending) return;
    setSending(true);
    try {
      const { error } = await supabase.rpc("post_admin_message", {
        _session_id: activeId,
        _content: content,
      });
      if (error) throw error;
      setInput("");
      await loadMessages(activeId);
    } catch (err) {
      console.error("reply error", err);
      alert("Failed to send reply.");
    } finally {
      setSending(false);
    }
  };

  const closeSession = async () => {
    if (!activeId) return;
    if (!confirm("Close this chat? The visitor can start a new one.")) return;
    const { error } = await supabase.rpc("close_chat_session", { _session_id: activeId });
    if (error) {
      alert("Failed to close chat.");
      return;
    }
    await loadSessions();
  };

  if (allowed === null) {
    return <div className="p-8 text-sm text-zinc-500">Loading…</div>;
  }
  if (!allowed) {
    return (
      <div className="p-8">
        <h1 className="text-lg font-semibold">Forbidden</h1>
        <p className="text-sm text-zinc-500">Admin access required.</p>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col gap-3 p-4 sm:p-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-semibold text-zinc-900">
            <MessageSquare className="h-5 w-5" /> Live Chat Inbox
          </h1>
          <p className="text-xs text-zinc-500">Anonymous visitor conversations from your site.</p>
        </div>
        <div className="flex gap-1 rounded-md border border-zinc-200 bg-white p-1 text-xs">
          {(["open", "closed", "all"] as const).map((k) => (
            <button
              key={k}
              onClick={() => setFilter(k)}
              className={`rounded px-3 py-1 capitalize ${
                filter === k ? "bg-zinc-900 text-white" : "text-zinc-600 hover:bg-zinc-100"
              }`}
            >
              {k}
            </button>
          ))}
        </div>
      </header>

      <div className="flex flex-1 gap-3 overflow-hidden rounded-lg border border-zinc-200 bg-white">
        {/* Session list */}
        <aside className="flex w-72 flex-col overflow-y-auto border-r border-zinc-200">
          {filtered.length === 0 && (
            <div className="p-6 text-center text-xs text-zinc-500">No conversations.</div>
          )}
          {filtered.map((s) => {
            const isActive = s.id === activeId;
            const label = s.guest_name || s.guest_email || "Anonymous visitor";
            return (
              <button
                key={s.id}
                onClick={() => setActiveId(s.id)}
                className={`flex flex-col gap-1 border-b border-zinc-100 px-3 py-3 text-left transition ${
                  isActive ? "bg-zinc-100" : "hover:bg-zinc-50"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-medium text-zinc-900">{label}</span>
                  {s.unread_admin > 0 && (
                    <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-semibold text-white">
                      {s.unread_admin}
                    </span>
                  )}
                </div>
                {s.guest_email && (
                  <span className="truncate text-[11px] text-zinc-500">{s.guest_email}</span>
                )}
                <div className="flex items-center gap-1 text-[10px] text-zinc-400">
                  <Circle className={`h-2 w-2 ${s.status === "open" ? "fill-green-500 text-green-500" : "fill-zinc-300 text-zinc-300"}`} />
                  <span>{new Date(s.last_message_at).toLocaleString()}</span>
                </div>
              </button>
            );
          })}
        </aside>

        {/* Conversation */}
        <section className="flex flex-1 flex-col">
          {!activeSession ? (
            <div className="flex flex-1 items-center justify-center text-sm text-zinc-500">
              Select a conversation to reply.
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3">
                <div>
                  <div className="text-sm font-semibold text-zinc-900">
                    {activeSession.guest_name || "Anonymous visitor"}
                  </div>
                  <div className="text-xs text-zinc-500">
                    {activeSession.guest_email || "No email provided"} · started{" "}
                    {new Date(activeSession.created_at).toLocaleString()}
                  </div>
                </div>
                {activeSession.status === "open" && (
                  <button
                    onClick={closeSession}
                    className="flex items-center gap-1 rounded-md border border-zinc-200 px-3 py-1.5 text-xs text-zinc-700 hover:bg-zinc-50"
                  >
                    <X className="h-3 w-3" /> Close
                  </button>
                )}
              </div>

              <div ref={scrollRef} className="flex-1 space-y-2 overflow-y-auto bg-zinc-50 p-4">
                {messages.map((m) => (
                  <div
                    key={m.id}
                    className={`flex ${m.sender === "admin" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[70%] whitespace-pre-wrap break-words rounded-2xl px-3 py-2 text-sm ${
                        m.sender === "admin"
                          ? "bg-zinc-900 text-white"
                          : "bg-white text-zinc-900 shadow-sm ring-1 ring-zinc-200"
                      }`}
                    >
                      {m.content}
                      <div className={`mt-1 text-[9px] ${m.sender === "admin" ? "text-zinc-400" : "text-zinc-400"}`}>
                        {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <form onSubmit={sendReply} className="border-t border-zinc-200 p-3">
                {activeSession.status === "closed" ? (
                  <div className="text-center text-xs text-zinc-500">This conversation is closed.</div>
                ) : (
                  <div className="flex items-end gap-2">
                    <textarea
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          sendReply(e as unknown as React.FormEvent);
                        }
                      }}
                      placeholder="Type your reply…"
                      rows={2}
                      maxLength={4000}
                      className="max-h-40 flex-1 resize-none rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-400"
                    />
                    <button
                      type="submit"
                      disabled={sending || !input.trim()}
                      className="flex h-10 items-center gap-2 rounded-md bg-zinc-900 px-4 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:opacity-50"
                    >
                      {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                      Send
                    </button>
                  </div>
                )}
              </form>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
