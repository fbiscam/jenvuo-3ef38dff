import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Inbox as InboxIcon,
  Send,
  Archive,
  Trash2,
  Star,
  Search,
  Pencil,
  ArrowLeft,
  RefreshCcw,
  Mail,
  X,
  AtSign,
  MoreVertical,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getMyMailAddress,
  claimMailAddress,
  checkUsernameAvailable,
  listMail,
  sendMail,
  setMailState,
  searchMailDirectory,
  type MailFolder,
  type MailListItem,
} from "@/lib/mail.functions";

export const Route = createFileRoute("/_authenticated/dashboard/gmails")({
  head: () => ({
    meta: [
      { title: "Inbox — JENVU AI" },
      { name: "description", content: "Your @jenvu.email inbox — private messages between JENVU members." },
    ],
  }),
  component: MailPage,
});

type ViewKey = "inbox" | "starred" | "sent" | "archive";
const FOLDERS: { key: ViewKey; label: string; icon: any }[] = [
  { key: "inbox", label: "Inbox", icon: InboxIcon },
  { key: "starred", label: "Starred", icon: Star },
  { key: "sent", label: "Sent", icon: Send },
  { key: "archive", label: "Archived", icon: Archive },
];

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d`;
  return new Date(iso).toLocaleDateString();
}

function initials(name?: string | null, address?: string) {
  const s = (name || address || "?").trim();
  return s.slice(0, 2).toUpperCase();
}

function MailPage() {
  const _getAddr = useServerFn(getMyMailAddress);
  const _claim = useServerFn(claimMailAddress);
  const _check = useServerFn(checkUsernameAvailable);
  const _list = useServerFn(listMail);
  const _send = useServerFn(sendMail);
  const _setState = useServerFn(setMailState);
  const _search = useServerFn(searchMailDirectory);

  const [myAddress, setMyAddress] = useState<string | null>(null);
  const [claiming, setClaiming] = useState(false);
  const [claimVal, setClaimVal] = useState("");
  const [claimStatus, setClaimStatus] = useState<"" | "ok" | "taken" | "invalid" | "checking">("");
  const [view, setView] = useState<ViewKey>("inbox");
  const folder: MailFolder = view === "starred" ? "inbox" : (view as MailFolder);
  const [messages, setMessages] = useState<MailListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [ready, setReady] = useState(false);
  const [selected, setSelected] = useState<MailListItem | null>(null);
  const [composeOpen, setComposeOpen] = useState(false);
  const [query, setQuery] = useState("");

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [addr, rows] = await Promise.all([
        _getAddr({}),
        _list({ data: { folder } }).catch(() => []),
      ]);
      setMyAddress((addr as any)?.address ?? null);
      setMessages(rows as MailListItem[]);
    } finally {
      setLoading(false);
      setReady(true);
    }
  }, [folder, _getAddr, _list]);

  useEffect(() => {
    load();
  }, [load]);


  // realtime: refresh on inbox changes
  useEffect(() => {
    let uid: string | null = null;
    let channel: any = null;
    (async () => {
      const { data } = await supabase.auth.getUser();
      uid = data.user?.id ?? null;
      if (!uid) return;
      channel = supabase
        .channel(`mail:${uid}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "mail_message_state", filter: `user_id=eq.${uid}` },
          () => load(true),
        )
        .subscribe();
    })();
    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [load]);

  const filtered = useMemo(() => {
    let list = messages;
    if (view === "starred") list = list.filter((m) => m.is_starred);
    if (!query.trim()) return list;
    const q = query.toLowerCase();
    return list.filter(
      (m) =>
        m.subject.toLowerCase().includes(q) ||
        m.body.toLowerCase().includes(q) ||
        m.sender_address.toLowerCase().includes(q) ||
        m.recipient_address.toLowerCase().includes(q) ||
        (m.sender_name ?? "").toLowerCase().includes(q),
    );
  }, [messages, query, view]);

  const unreadCount = messages.filter((m) => !m.is_read && m.folder === "inbox").length;

  const openMessage = async (m: MailListItem) => {
    setSelected(m);
    if (!m.is_read) {
      try {
        await _setState({ data: { message_id: m.message_id, is_read: true } });
        setMessages((prev) => prev.map((x) => (x.message_id === m.message_id ? { ...x, is_read: true } : x)));
      } catch {}
    }
  };

  const moveTo = async (m: MailListItem, target: MailFolder) => {
    try {
      await _setState({ data: { message_id: m.message_id, folder: target } });
      setMessages((prev) => prev.filter((x) => x.message_id !== m.message_id));
      if (selected?.message_id === m.message_id) setSelected(null);
      toast.success(`Moved to ${target}`);
    } catch (e: any) {
      toast.error(e?.message || "Failed");
    }
  };

  const toggleStar = async (m: MailListItem) => {
    try {
      await _setState({ data: { message_id: m.message_id, is_starred: !m.is_starred } });
      setMessages((prev) =>
        prev.map((x) => (x.message_id === m.message_id ? { ...x, is_starred: !m.is_starred } : x)),
      );
    } catch {}
  };

  // debounced username check
  useEffect(() => {
    if (!claimVal) {
      setClaimStatus("");
      return;
    }
    setClaimStatus("checking");
    const t = setTimeout(async () => {
      try {
        const r = await _check({ data: { local_part: claimVal } });
        setClaimStatus(r.reason === "ok" ? "ok" : r.reason);
      } catch {
        setClaimStatus("invalid");
      }
    }, 350);
    return () => clearTimeout(t);
  }, [claimVal, _check]);

  const submitClaim = async () => {
    setClaiming(true);
    try {
      const r = await _claim({ data: { local_part: claimVal } });
      setMyAddress(r.address);
      toast.success(`Your address is ${r.address}`);
    } catch (e: any) {
      toast.error(e?.message || "Failed to claim");
    } finally {
      setClaiming(false);
    }
  };

  // ------------ Initial load: stable white shell to prevent flicker ------------
  if (!ready) {
    return <div className="min-h-[calc(100vh-4rem)] bg-white" />;
  }

  // ------------ Claim address screen ------------
  if (!myAddress) {

    return (
      <div className="min-h-[calc(100vh-4rem)] bg-white flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="w-14 h-14 rounded-2xl bg-white border border-gray-200 text-black flex items-center justify-center mx-auto mb-4 shadow-sm">
              <AtSign className="w-7 h-7" />
            </div>
            <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 whitespace-nowrap">Claim your JENVU address</h1>
            <p className="text-xs sm:text-sm text-gray-500 mt-2 whitespace-nowrap">
              Your private inbox — message any JENVU member.
            </p>
          </div>
          <div className="border border-gray-200 rounded-2xl p-5 bg-white shadow-sm">
            <label className="block text-xs font-medium text-gray-600 mb-2">Choose a username</label>
            <div className="flex items-stretch rounded-xl border border-gray-300 focus-within:border-black overflow-hidden">
              <input
                autoFocus
                value={claimVal}
                onChange={(e) => setClaimVal(e.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, ""))}
                placeholder="your.name"
                maxLength={32}
                className="flex-1 min-w-0 px-3 py-2.5 text-sm outline-none bg-white"
              />
              <span className="shrink-0 px-2 sm:px-3 py-2.5 text-xs sm:text-sm text-gray-500 bg-gray-50 border-l border-gray-200 flex items-center">
                @jenvu.email
              </span>
            </div>
            <div className="h-5 mt-2 text-xs">
              {claimStatus === "checking" && <span className="text-gray-400">Checking…</span>}
              {claimStatus === "ok" && <span className="text-green-600">Available</span>}
              {claimStatus === "taken" && <span className="text-red-600">Already taken</span>}
              {claimStatus === "invalid" && claimVal.length > 0 && (
                <span className="text-red-600">4–32 chars, letters/numbers/._-</span>
              )}
            </div>
            <button
              disabled={claimStatus !== "ok" || claiming}
              onClick={submitClaim}
              className="w-full mt-2 py-2.5 rounded-xl bg-black text-white text-sm font-medium disabled:opacity-40 hover:bg-gray-800 transition"
            >
              {claiming ? "Claiming…" : "Claim address"}
            </button>
            <p className="text-[10px] sm:text-[11px] text-gray-400 mt-3 text-center whitespace-nowrap">
              Cannot be changed later. Only JENVU members can email you.
            </p>

          </div>
        </div>
      </div>
    );
  }

  // ------------ Mail UI ------------
  return (
    <div className="min-h-[calc(100vh-4rem)] bg-white">
      <div className="max-w-[1400px] mx-auto flex flex-col lg:flex-row gap-0 lg:gap-4 lg:p-4">
        {/* Sidebar */}
        <aside className="lg:w-56 shrink-0 lg:sticky lg:top-4 lg:self-start px-3 py-4 lg:p-0">
          <button
            onClick={() => setComposeOpen(true)}
            className="w-full flex items-center gap-2 justify-center bg-white text-gray-900 border border-gray-200 shadow-[0_1px_3px_rgba(0,0,0,0.06)] rounded-full py-3 text-sm font-medium hover:shadow-md hover:bg-gray-50 transition mb-6"
          >
            <Pencil className="w-4 h-4 text-gray-700" /> Compose
          </button>
          <nav className="space-y-1.5">
            {FOLDERS.map((f) => {
              const Icon = f.icon;
              const active = view === f.key;
              return (
                <button
                  key={f.key}
                  onClick={() => {
                    setView(f.key);
                    setSelected(null);
                  }}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-2.5 rounded-full text-sm transition",
                    active
                      ? "bg-white shadow-[0_1px_3px_rgba(0,0,0,0.06)] border border-gray-100 text-gray-900 font-semibold"
                      : "text-gray-600 hover:bg-gray-50",
                  )}
                >
                  <Icon className={cn("w-[18px] h-[18px]", active ? "text-blue-600" : "text-gray-500")} strokeWidth={active ? 2.2 : 1.8} />
                  <span className="flex-1 text-left">{f.label}</span>
                  {f.key === "inbox" && unreadCount > 0 && (
                    <span className="text-[11px] px-1.5 py-0.5 rounded-full font-medium bg-red-500 text-white">
                      {unreadCount}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
          {myAddress && (
            <div className="mt-6 px-3 py-2 rounded-lg bg-gray-50 border border-gray-200">
              <div className="text-[10px] uppercase tracking-wide text-gray-400">Your address</div>
              <div className="text-xs font-medium text-gray-900 truncate">{myAddress}</div>
            </div>
          )}
        </aside>

        {/* Main */}
        <section className="flex-1 min-w-0 border-x-0 lg:border lg:border-gray-200 lg:rounded-2xl overflow-hidden bg-white">
          {/* Header */}
          <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-200">
            {selected && (
              <button onClick={() => setSelected(null)} className="lg:hidden p-1.5 hover:bg-gray-100 rounded">
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search mail"
                className="w-full pl-9 pr-3 py-2 text-sm rounded-lg bg-gray-100 focus:bg-white focus:ring-1 focus:ring-black outline-none border border-transparent focus:border-gray-300"
              />
            </div>
            <button
              onClick={() => load()}
              className="p-2 hover:bg-gray-100 rounded-lg text-gray-500"
              title="Refresh"
            >
              <RefreshCcw className="w-4 h-4" />
            </button>
          </div>

          {/* Split view */}
          <div className="grid lg:grid-cols-[380px_1fr] min-h-[500px]">
            {/* List */}
            <div className={cn("border-r border-gray-200", selected ? "hidden lg:block" : "block")}>
              {loading ? (
                <div className="p-8 text-center text-sm text-gray-400">Loading…</div>
              ) : filtered.length === 0 ? (
                <div className="p-12 text-center">
                  <Mail className="w-10 h-10 mx-auto text-gray-300 mb-2" />
                  <div className="text-sm text-gray-500">Nothing here</div>
                </div>
              ) : (
                <ul>
                  {filtered.map((m) => {
                    const active = selected?.message_id === m.message_id;
                    const who =
                      folder === "sent"
                        ? m.recipient_address
                        : m.sender_name || m.sender_address;
                    return (
                      <li key={m.message_id}>
                        <button
                          onClick={() => openMessage(m)}
                          className={cn(
                            "w-full text-left px-4 py-3 border-b border-gray-100 flex gap-3 items-start hover:bg-gray-50 transition",
                            active && "bg-gray-100",
                            !m.is_read && folder === "inbox" && "bg-blue-50/40",
                          )}
                        >
                          <div className="w-9 h-9 rounded-full bg-gray-900 text-white flex items-center justify-center text-xs font-semibold shrink-0 overflow-hidden">
                            {m.sender_avatar ? (
                              <img src={m.sender_avatar} alt="" className="w-full h-full object-cover" />
                            ) : (
                              initials(m.sender_name, m.sender_address)
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span
                                className={cn(
                                  "text-sm truncate",
                                  !m.is_read && folder === "inbox"
                                    ? "font-semibold text-gray-900"
                                    : "text-gray-700",
                                )}
                              >
                                {who}
                              </span>
                              <span className="ml-auto text-[11px] text-gray-400 shrink-0">
                                {timeAgo(m.created_at)}
                              </span>
                            </div>
                            <div
                              className={cn(
                                "text-sm truncate",
                                !m.is_read && folder === "inbox"
                                  ? "text-gray-900 font-medium"
                                  : "text-gray-600",
                              )}
                            >
                              {m.subject || "(no subject)"}
                            </div>
                            <div className="text-xs text-gray-400 truncate">
                              {m.body.slice(0, 100)}
                            </div>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleStar(m);
                            }}
                            className="shrink-0 p-1"
                          >
                            <Star
                              className={cn(
                                "w-4 h-4",
                                m.is_starred ? "fill-yellow-400 text-yellow-400" : "text-gray-300",
                              )}
                            />
                          </button>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {/* Detail */}
            <div className={cn("bg-white", !selected ? "hidden lg:block" : "block")}>
              {!selected ? (
                <div className="h-full flex flex-col items-center justify-center p-12 text-center">
                  <MailOpen className="w-12 h-12 text-gray-200 mb-3" />
                  <div className="text-sm text-gray-400">Select a message to read</div>
                </div>
              ) : (
                <div className="p-6">
                  <div className="flex items-start gap-3 mb-4">
                    <div className="w-11 h-11 rounded-full bg-gray-900 text-white flex items-center justify-center text-sm font-semibold overflow-hidden">
                      {selected.sender_avatar ? (
                        <img src={selected.sender_avatar} alt="" className="w-full h-full object-cover" />
                      ) : (
                        initials(selected.sender_name, selected.sender_address)
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-gray-900">
                        {selected.sender_name || selected.sender_address}
                      </div>
                      <div className="text-xs text-gray-500">
                        {selected.sender_address} → {selected.recipient_address}
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5">
                        {new Date(selected.created_at).toLocaleString()}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {selected.folder !== "archive" && (
                        <button
                          onClick={() => moveTo(selected, "archive")}
                          className="p-2 hover:bg-gray-100 rounded-lg text-gray-500"
                          title="Archive"
                        >
                          <Archive className="w-4 h-4" />
                        </button>
                      )}
                      {selected.folder !== "trash" && (
                        <button
                          onClick={() => moveTo(selected, "trash")}
                          className="p-2 hover:bg-gray-100 rounded-lg text-gray-500"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                  <h1 className="text-xl font-semibold text-gray-900 mb-4">
                    {selected.subject || "(no subject)"}
                  </h1>
                  <div className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
                    {selected.body}
                  </div>
                  {selected.sender_address !== myAddress && (
                    <div className="mt-6 pt-4 border-t border-gray-200">
                      <button
                        onClick={() => setComposeOpen(true)}
                        className="px-4 py-2 rounded-lg bg-black text-white text-sm hover:bg-gray-800"
                      >
                        Reply
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </section>
      </div>

      {composeOpen && (
        <ComposeModal
          onClose={() => setComposeOpen(false)}
          myAddress={myAddress}
          replyTo={selected && selected.sender_address !== myAddress ? selected : null}
          onSend={async ({ to, subject, body }) => {
            await _send({ data: { to, subject, body } });
            setComposeOpen(false);
            toast.success("Message sent");
            if (folder === "sent") load();
          }}
          searchDirectory={async (q) => {
            const r = await _search({ data: { q } });
            return r;
          }}
        />
      )}
    </div>
  );
}

function ComposeModal(props: {
  onClose: () => void;
  myAddress: string | null;
  replyTo: MailListItem | null;
  onSend: (v: { to: string; subject: string; body: string }) => Promise<void>;
  searchDirectory: (q: string) => Promise<{ address: string; full_name: string | null }[]>;
}) {
  const { onClose, myAddress, replyTo, onSend, searchDirectory } = props;
  const [to, setTo] = useState(replyTo ? replyTo.sender_address : "");
  const [subject, setSubject] = useState(
    replyTo ? (replyTo.subject.startsWith("Re:") ? replyTo.subject : `Re: ${replyTo.subject}`) : "",
  );
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [suggest, setSuggest] = useState<{ address: string; full_name: string | null }[]>([]);
  const [showSug, setShowSug] = useState(false);
  const debounceRef = useRef<any>(null);

  const onToChange = (v: string) => {
    setTo(v);
    setShowSug(true);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      if (v.trim().length < 1) {
        setSuggest([]);
        return;
      }
      try {
        const r = await searchDirectory(v.trim());
        setSuggest(r);
      } catch {}
    }, 250);
  };

  const submit = async () => {
    if (!to.trim().endsWith("@jenvu.email")) {
      toast.error("Recipient must end with @jenvu.email");
      return;
    }
    setSending(true);
    try {
      await onSend({ to: to.trim().toLowerCase(), subject, body });
    } catch (e: any) {
      toast.error(e?.message || "Failed to send");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/30 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-2xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[92vh]">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <div className="text-sm font-semibold text-gray-900">New message</div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-4 py-3 space-y-3 flex-1 overflow-auto">
          <div className="text-xs text-gray-500">
            From: <span className="font-medium text-gray-800">{myAddress}</span>
          </div>
          <div className="relative">
            <div className="flex items-center gap-2 border-b border-gray-200 pb-2">
              <span className="text-xs text-gray-500 w-14">To</span>
              <input
                value={to}
                onChange={(e) => onToChange(e.target.value)}
                onFocus={() => setShowSug(true)}
                onBlur={() => setTimeout(() => setShowSug(false), 150)}
                placeholder="username@jenvu.email"
                className="flex-1 text-sm outline-none"
              />
            </div>
            {showSug && suggest.length > 0 && (
              <div className="absolute left-14 right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-56 overflow-auto">
                {suggest.map((s) => (
                  <button
                    key={s.address}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      setTo(s.address);
                      setShowSug(false);
                    }}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 flex justify-between"
                  >
                    <span>{s.full_name || s.address}</span>
                    <span className="text-xs text-gray-400">{s.address}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 border-b border-gray-200 pb-2">
            <span className="text-xs text-gray-500 w-14">Subject</span>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Subject"
              maxLength={300}
              className="flex-1 text-sm outline-none"
            />
          </div>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Write your message…"
            rows={12}
            className="w-full text-sm outline-none resize-none min-h-[240px]"
          />
        </div>
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
          <div className="text-[11px] text-gray-400">Internal only — JENVU members</div>
          <button
            onClick={submit}
            disabled={sending || !to.trim() || !body.trim()}
            className="px-5 py-2 rounded-lg bg-black text-white text-sm font-medium disabled:opacity-40 hover:bg-gray-800 flex items-center gap-2"
          >
            <Send className="w-4 h-4" /> {sending ? "Sending…" : "Send"}
          </button>
        </div>
      </div>
    </div>
  );
}
