import { useCallback, useEffect, useRef, useState } from "react";
import { MessageCircle, X, Send, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type ChatMsg = {
  id: string;
  sender: "guest" | "admin";
  content: string;
  created_at: string;
};

const STORAGE_KEY = "jenvu_chat_token_v1";
const NAME_KEY = "jenvu_chat_name_v1";
const POLL_MS = 2500;

export function LiveChatWidget() {
  const [pathname, setPathname] = useState<string>(() =>
    typeof window !== "undefined" ? window.location.pathname : ""
  );
  useEffect(() => {
    if (typeof window === "undefined") return;
    const update = () => setPathname(window.location.pathname);
    window.addEventListener("popstate", update);
    const push = history.pushState;
    const replace = history.replaceState;
    history.pushState = function (...args) {
      const r = push.apply(this, args as any);
      update();
      return r;
    };
    history.replaceState = function (...args) {
      const r = replace.apply(this, args as any);
      update();
      return r;
    };
    return () => {
      window.removeEventListener("popstate", update);
      history.pushState = push;
      history.replaceState = replace;
    };
  }, []);
  const allowed = pathname === "/contact" || pathname.startsWith("/help");

  const [open, setOpen] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [starting, setStarting] = useState(false);
  const [status, setStatus] = useState<string>("open");
  const [unread, setUnread] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const lastCountRef = useRef(0);

  // Load token from storage
  useEffect(() => {
    if (typeof window === "undefined") return;
    const t = localStorage.getItem(STORAGE_KEY);
    const n = localStorage.getItem(NAME_KEY);
    if (t) setToken(t);
    if (n) setName(n);
  }, []);

  const fetchMessages = useCallback(async (t: string) => {
    const { data, error } = await supabase.rpc("get_guest_messages", { _token: t });
    if (error) {
      console.error("chat fetch error", error);
      return;
    }
    const rows = (data ?? []) as (ChatMsg & { session_status: string })[];
    setMessages(rows.map((r) => ({ id: r.id, sender: r.sender, content: r.content, created_at: r.created_at })));
    if (rows.length > 0) setStatus(rows[0].session_status);
    // Unread badge when closed
    if (!open) {
      const admins = rows.filter((r) => r.sender === "admin").length;
      if (admins > lastCountRef.current) setUnread((u) => u + (admins - lastCountRef.current));
      lastCountRef.current = admins;
    } else {
      lastCountRef.current = rows.filter((r) => r.sender === "admin").length;
      setUnread(0);
    }
  }, [open]);

  // Poll while token exists
  useEffect(() => {
    if (!token) return;
    fetchMessages(token);
    const id = setInterval(() => fetchMessages(token), POLL_MS);
    return () => clearInterval(id);
  }, [token, fetchMessages]);

  // Autoscroll
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, open]);

  // Focus input on open
  useEffect(() => {
    if (open && token) setTimeout(() => inputRef.current?.focus(), 50);
    if (open) setUnread(0);
  }, [open, token]);

  const startChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (starting) return;
    setStarting(true);
    try {
      const { data, error } = await supabase.rpc("create_chat_session", {
        _name: name || "",
        _email: email || "",
        _user_agent: typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 500) : "",
      });
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      const newToken = row?.session_token as string;
      if (!newToken) throw new Error("no token returned");
      localStorage.setItem(STORAGE_KEY, newToken);
      if (name) localStorage.setItem(NAME_KEY, name);
      setToken(newToken);
    } catch (err) {
      console.error("start chat error", err);
      alert("Couldn't start chat. Please try again.");
    } finally {
      setStarting(false);
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const content = input.trim();
    if (!content || !token || sending) return;
    setSending(true);
    // Optimistic
    const tempId = `tmp-${Date.now()}`;
    setMessages((m) => [...m, { id: tempId, sender: "guest", content, created_at: new Date().toISOString() }]);
    setInput("");
    try {
      const { error } = await supabase.rpc("post_guest_message", { _token: token, _content: content });
      if (error) throw error;
      await fetchMessages(token);
    } catch (err) {
      console.error("send error", err);
      setMessages((m) => m.filter((x) => x.id !== tempId));
      setInput(content);
      alert("Message failed to send.");
    } finally {
      setSending(false);
    }
  };

  const resetChat = () => {
    localStorage.removeItem(STORAGE_KEY);
    setToken(null);
    setMessages([]);
    setStatus("open");
    lastCountRef.current = 0;
  };

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Close chat" : "Open support chat"}
        className="fixed bottom-5 right-5 z-[9999] flex h-14 w-14 items-center justify-center rounded-full bg-zinc-900 text-white shadow-lg transition hover:bg-zinc-800 active:scale-95"
      >
        {open ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
        {!open && unread > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-semibold text-white">
            {unread}
          </span>
        )}
      </button>

      {/* Panel */}
      {open && (
        <div className="fixed bottom-24 right-5 z-[9999] flex h-[520px] w-[calc(100vw-2.5rem)] max-w-sm flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl sm:right-5">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-zinc-200 bg-white px-4 py-3 text-black">
            <div>
              <div className="text-sm font-semibold">Jenvu Support</div>
              <div className="text-[11px] text-zinc-600">
                {token ? (status === "closed" ? "Chat closed" : "Typically replies within a few minutes") : "Start a conversation"}
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              aria-label="Close"
              className="rounded p-1 text-zinc-700 hover:bg-zinc-100 hover:text-black"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Body */}
          {!token ? (
            <form onSubmit={startChat} className="flex flex-1 flex-col gap-3 p-4">
              <div className="text-sm text-zinc-700">
                Hi 👋 Ask us anything — no signup needed.
              </div>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name (optional)"
                maxLength={80}
                className="rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-400"
              />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email (optional, for follow-up)"
                maxLength={200}
                className="rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-400"
              />
              <button
                type="submit"
                disabled={starting}
                className="mt-auto rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:opacity-60"
              >
                {starting ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : "Start chat"}
              </button>
              <p className="text-[10px] text-zinc-400">
                We'll only use your email to reply to this conversation.
              </p>
            </form>
          ) : (
            <>
              <div ref={scrollRef} className="flex-1 space-y-2 overflow-y-auto bg-zinc-50 p-3">
                {messages.length === 0 && (
                  <div className="mt-8 text-center text-xs text-zinc-500">
                    Send us your first message — we'll get back to you here.
                  </div>
                )}
                {messages.map((m) => (
                  <div
                    key={m.id}
                    className={`flex ${m.sender === "guest" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[80%] whitespace-pre-wrap break-words rounded-2xl px-3 py-2 text-sm ${
                        m.sender === "guest"
                          ? "bg-zinc-900 text-white"
                          : "bg-white text-zinc-900 shadow-sm ring-1 ring-zinc-200"
                      }`}
                    >
                      {m.content}
                    </div>
                  </div>
                ))}
              </div>

              <form onSubmit={sendMessage} className="border-t border-zinc-200 bg-white p-2">
                {status === "closed" ? (
                  <div className="flex items-center justify-between px-2 py-1 text-xs text-zinc-500">
                    <span>This chat is closed.</span>
                    <button type="button" onClick={resetChat} className="text-zinc-900 underline">
                      Start a new one
                    </button>
                  </div>
                ) : (
                  <div className="flex items-end gap-2">
                    <textarea
                      ref={inputRef}
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          sendMessage(e as unknown as React.FormEvent);
                        }
                      }}
                      placeholder="Type a message…"
                      rows={1}
                      maxLength={4000}
                      className="max-h-32 flex-1 resize-none rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-400"
                    />
                    <button
                      type="submit"
                      disabled={sending || !input.trim()}
                      aria-label="Send"
                      className="flex h-9 w-9 items-center justify-center rounded-md bg-zinc-900 text-white transition hover:bg-zinc-800 disabled:opacity-50"
                    >
                      {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    </button>
                  </div>
                )}
              </form>
            </>
          )}
        </div>
      )}
    </>
  );
}
