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
  MailOpen,
  X,
  AtSign,
  CheckCheck,
  Sparkles,
  Copy,
  Check,
  Reply,
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

const FOLDERS: { key: MailFolder; label: string; icon: any }[] = [
  { key: "inbox", label: "Inbox", icon: InboxIcon },
  { key: "sent", label: "Sent", icon: Send },
  { key: "archive", label: "Archive", icon: Archive },
  { key: "trash", label: "Trash", icon: Trash2 },
];

type ViewFilter = "all" | "unread" | "starred";

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

// Deterministic soft gradient for sender avatar background
function avatarGradient(seed: string) {
  const palettes = [
    "from-indigo-500 to-purple-500",
    "from-sky-500 to-cyan-500",
    "from-emerald-500 to-teal-500",
    "from-amber-500 to-orange-500",
    "from-pink-500 to-rose-500",
    "from-violet-500 to-fuchsia-500",
    "from-blue-500 to-indigo-500",
    "from-lime-500 to-emerald-500",
  ];
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return palettes[h % palettes.length];
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
  const [folder, setFolder] = useState<MailFolder>("inbox");
  const [messages, setMessages] = useState<MailListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [ready, setReady] = useState(false);
  const [selected, setSelected] = useState<MailListItem | null>(null);
  const [composeOpen, setComposeOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [view, setView] = useState<ViewFilter>("all");
  const [selection, setSelection] = useState<Set<string>>(new Set());
  const [copied, setCopied] = useState(false);

  // per-folder unread counts (inbox is the meaningful one; others shown for consistency)
  const [folderCounts, setFolderCounts] = useState<Record<MailFolder, { total: number; unread: number }>>({
    inbox: { total: 0, unread: 0 },
    sent: { total: 0, unread: 0 },
    archive: { total: 0, unread: 0 },
    trash: { total: 0, unread: 0 },
  });

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [addr, rows] = await Promise.all([
        _getAddr({}),
        _list({ data: { folder } }).catch(() => []),
      ]);
      setMyAddress((addr as any)?.address ?? null);
      const list = rows as MailListItem[];
      setMessages(list);
      setFolderCounts((prev) => ({
        ...prev,
        [folder]: {
          total: list.length,
          unread: list.filter((m) => !m.is_read && folder === "inbox").length,
        },
      }));
    } finally {
      setLoading(false);
      setReady(true);
    }
  }, [folder, _getAddr, _list]);

  useEffect(() => { load(); }, [load]);

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

  // reset selection when folder changes
  useEffect(() => { setSelection(new Set()); setSelected(null); }, [folder]);

  const filtered = useMemo(() => {
    let list = messages;
    if (view === "unread") list = list.filter((m) => !m.is_read);
    else if (view === "starred") list = list.filter((m) => m.is_starred);
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(
        (m) =>
          m.subject.toLowerCase().includes(q) ||
          m.body.toLowerCase().includes(q) ||
          m.sender_address.toLowerCase().includes(q) ||
          m.recipient_address.toLowerCase().includes(q) ||
          (m.sender_name ?? "").toLowerCase().includes(q),
      );
    }
    return list;
  }, [messages, query, view]);

  const unreadCount = messages.filter((m) => !m.is_read && folder === "inbox").length;
  const starredCount = messages.filter((m) => m.is_starred).length;

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

  const toggleSelect = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelection((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const bulkAction = async (action: "read" | "archive" | "trash") => {
    const ids = Array.from(selection);
    if (ids.length === 0) return;
    try {
      await Promise.all(
        ids.map((id) => {
          if (action === "read") return _setState({ data: { message_id: id, is_read: true } });
          if (action === "archive") return _setState({ data: { message_id: id, folder: "archive" } });
          return _setState({ data: { message_id: id, folder: "trash" } });
        }),
      );
      if (action === "read") {
        setMessages((prev) => prev.map((x) => (ids.includes(x.message_id) ? { ...x, is_read: true } : x)));
      } else {
        setMessages((prev) => prev.filter((x) => !ids.includes(x.message_id)));
      }
      setSelection(new Set());
      toast.success(
        action === "read" ? `Marked ${ids.length} as read` : `Moved ${ids.length} to ${action}`,
      );
    } catch (e: any) {
      toast.error(e?.message || "Bulk action failed");
    }
  };

  const markAllRead = async () => {
    const ids = messages.filter((m) => !m.is_read).map((m) => m.message_id);
    if (ids.length === 0) return;
    try {
      await Promise.all(ids.map((id) => _setState({ data: { message_id: id, is_read: true } })));
      setMessages((prev) => prev.map((x) => ({ ...x, is_read: true })));
      toast.success(`Marked ${ids.length} as read`);
    } catch (e: any) {
      toast.error(e?.message || "Failed");
    }
  };

  const copyAddress = async () => {
    if (!myAddress) return;
    try {
      await navigator.clipboard.writeText(myAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {}
  };

  // debounced username check
  useEffect(() => {
    if (!claimVal) { setClaimStatus(""); return; }
    setClaimStatus("checking");
    const t = setTimeout(async () => {
      try {
        const r = await _check({ data: { local_part: claimVal } });
        setClaimStatus(r.reason === "ok" ? "ok" : r.reason);
      } catch { setClaimStatus("invalid"); }
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
    } finally { setClaiming(false); }
  };

  // ---------- Initial stable shell ----------
  if (!ready) return <div className="min-h-[calc(100vh-4rem)] bg-white" />;

  // ---------- Claim screen ----------
  if (!myAddress) {
    return (
      <div className="min-h-[calc(100vh-4rem)] bg-white flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-500 text-white flex items-center justify-center mx-auto mb-4 shadow-lg shadow-indigo-500/20">
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

  const anySelected = selection.size > 0;

  // ---------- Mail UI ----------
  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-gray-50/60 via-white to-white">
      <div className="max-w-[1500px] mx-auto flex flex-col lg:flex-row gap-0 lg:gap-5 lg:p-5">
        {/* Sidebar */}
        <aside className="lg:w-60 shrink-0 lg:sticky lg:top-4 lg:self-start px-3 py-4 lg:p-0">
          {/* Compose */}
          <button
            onClick={() => setComposeOpen(true)}
            className="w-full flex items-center gap-2 justify-center bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-2xl py-3 text-sm font-semibold shadow-lg shadow-indigo-500/25 hover:shadow-xl hover:shadow-indigo-500/30 hover:scale-[1.01] active:scale-[0.99] transition mb-4"
          >
            <Pencil className="w-4 h-4" /> Compose
          </button>

          {/* Folders */}
          <nav className="space-y-1">
            {FOLDERS.map((f) => {
              const Icon = f.icon;
              const active = folder === f.key;
              const badge = f.key === "inbox" ? unreadCount : 0;
              return (
                <button
                  key={f.key}
                  onClick={() => setFolder(f.key)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition",
                    active
                      ? "bg-gradient-to-r from-gray-900 to-gray-800 text-white shadow-sm"
                      : "text-gray-700 hover:bg-gray-100",
                  )}
                >
                  <Icon className={cn("w-4 h-4", active ? "text-white" : "text-gray-500")} />
                  <span className="flex-1 text-left font-medium">{f.label}</span>
                  {badge > 0 && (
                    <span
                      className={cn(
                        "text-[11px] px-1.5 py-0.5 rounded-full font-semibold",
                        active ? "bg-white text-gray-900" : "bg-red-500 text-white",
                      )}
                    >
                      {badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Address card */}
          <div className="mt-5 rounded-2xl bg-white border border-gray-200 p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center">
                <Sparkles className="w-3 h-3 text-white" />
              </div>
              <div className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">Your address</div>
            </div>
            <div className="text-xs font-semibold text-gray-900 truncate">{myAddress}</div>
            <button
              onClick={copyAddress}
              className="mt-2 w-full flex items-center justify-center gap-1.5 text-[11px] font-medium text-gray-600 hover:text-gray-900 bg-gray-50 hover:bg-gray-100 rounded-lg py-1.5 transition"
            >
              {copied ? <><Check className="w-3 h-3 text-green-600" /> Copied</> : <><Copy className="w-3 h-3" /> Copy</>}
            </button>
          </div>

          {/* Tips */}
          <div className="mt-3 rounded-xl bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-100 p-3">
            <div className="text-[10px] uppercase tracking-wider text-indigo-700 font-semibold mb-1">Shortcut</div>
            <div className="text-[11px] text-indigo-900/80 leading-relaxed">
              Press <kbd className="px-1 py-0.5 rounded bg-white border border-indigo-200 text-[10px] font-semibold">⌘</kbd> + <kbd className="px-1 py-0.5 rounded bg-white border border-indigo-200 text-[10px] font-semibold">↵</kbd> to send fast.
            </div>
          </div>
        </aside>

        {/* Main panel */}
        <section className="flex-1 min-w-0 border-x-0 lg:border lg:border-gray-200 lg:rounded-3xl overflow-hidden bg-white shadow-sm">
          {/* Header */}
          <div className="border-b border-gray-200">
            <div className="flex items-center gap-2 px-4 py-3">
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
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-xl bg-gray-100 focus:bg-white focus:ring-2 focus:ring-indigo-500/30 outline-none border border-transparent focus:border-indigo-400 transition"
                />
              </div>
              {folder === "inbox" && unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="hidden sm:flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition"
                  title="Mark all as read"
                >
                  <CheckCheck className="w-4 h-4" /> Mark all read
                </button>
              )}
              <button
                onClick={() => load()}
                className="p-2 hover:bg-gray-100 rounded-lg text-gray-500"
                title="Refresh"
              >
                <RefreshCcw className={cn("w-4 h-4", loading && "animate-spin")} />
              </button>
            </div>

            {/* Filter tabs */}
            <div className="flex items-center gap-1 px-4 pb-2">
              {([
                { key: "all", label: "All", count: messages.length },
                { key: "unread", label: "Unread", count: messages.filter((m) => !m.is_read).length },
                { key: "starred", label: "Starred", count: starredCount },
              ] as { key: ViewFilter; label: string; count: number }[]).map((t) => {
                const active = view === t.key;
                return (
                  <button
                    key={t.key}
                    onClick={() => setView(t.key)}
                    className={cn(
                      "px-3 py-1.5 rounded-full text-xs font-medium transition flex items-center gap-1.5",
                      active
                        ? "bg-gray-900 text-white"
                        : "text-gray-600 hover:bg-gray-100",
                    )}
                  >
                    <span>{t.label}</span>
                    <span className={cn("text-[10px] px-1 rounded", active ? "bg-white/20" : "text-gray-400")}>
                      {t.count}
                    </span>
                  </button>
                );
              })}
              {anySelected && (
                <div className="ml-auto flex items-center gap-1">
                  <span className="text-xs text-gray-500 mr-1">{selection.size} selected</span>
                  <button
                    onClick={() => bulkAction("read")}
                    className="px-2.5 py-1.5 text-xs rounded-lg hover:bg-gray-100 text-gray-700 flex items-center gap-1"
                    title="Mark read"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => bulkAction("archive")}
                    className="px-2.5 py-1.5 text-xs rounded-lg hover:bg-gray-100 text-gray-700 flex items-center gap-1"
                    title="Archive"
                  >
                    <Archive className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => bulkAction("trash")}
                    className="px-2.5 py-1.5 text-xs rounded-lg hover:bg-red-50 text-red-600 flex items-center gap-1"
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Split view */}
          <div className="grid lg:grid-cols-[400px_1fr] min-h-[560px]">
            {/* List */}
            <div className={cn("border-r border-gray-200", selected ? "hidden lg:block" : "block")}>
              {loading ? (
                <div className="p-8 space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex gap-3 animate-pulse">
                      <div className="w-9 h-9 rounded-full bg-gray-100" />
                      <div className="flex-1 space-y-2">
                        <div className="h-3 bg-gray-100 rounded w-1/3" />
                        <div className="h-3 bg-gray-100 rounded w-2/3" />
                        <div className="h-2 bg-gray-100 rounded w-full" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : filtered.length === 0 ? (
                <div className="p-12 text-center">
                  <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-gray-100 to-gray-50 flex items-center justify-center mb-3">
                    <Mail className="w-6 h-6 text-gray-400" />
                  </div>
                  <div className="text-sm font-medium text-gray-700">
                    {view === "unread" ? "No unread messages" : view === "starred" ? "No starred messages" : "Nothing here yet"}
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    {folder === "inbox" ? "Messages from JENVU members will land here." : `Your ${folder} folder is empty.`}
                  </div>
                </div>
              ) : (
                <ul>
                  {filtered.map((m) => {
                    const active = selected?.message_id === m.message_id;
                    const isSel = selection.has(m.message_id);
                    const who = folder === "sent" ? m.recipient_address : m.sender_name || m.sender_address;
                    const grad = avatarGradient(m.sender_address || m.recipient_address || "x");
                    return (
                      <li key={m.message_id}>
                        <button
                          onClick={() => openMessage(m)}
                          className={cn(
                            "w-full text-left px-4 py-3 border-b border-gray-100 flex gap-3 items-start hover:bg-gray-50 transition group relative",
                            active && "bg-indigo-50/50",
                            !m.is_read && folder === "inbox" && !active && "bg-blue-50/30",
                            isSel && "bg-indigo-50/70",
                          )}
                        >
                          {!m.is_read && folder === "inbox" && (
                            <span className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-indigo-500 to-purple-500" />
                          )}
                          {/* checkbox */}
                          <span
                            onClick={(e) => toggleSelect(m.message_id, e)}
                            className={cn(
                              "w-4 h-4 mt-2 rounded border-2 flex items-center justify-center shrink-0 transition",
                              isSel
                                ? "bg-indigo-600 border-indigo-600"
                                : "border-gray-300 group-hover:border-gray-400",
                            )}
                          >
                            {isSel && <Check className="w-3 h-3 text-white" />}
                          </span>
                          <div
                            className={cn(
                              "w-9 h-9 rounded-full text-white flex items-center justify-center text-xs font-semibold shrink-0 overflow-hidden bg-gradient-to-br",
                              grad,
                            )}
                          >
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
                            onClick={(e) => { e.stopPropagation(); toggleStar(m); }}
                            className="shrink-0 p-1"
                          >
                            <Star
                              className={cn(
                                "w-4 h-4 transition",
                                m.is_starred ? "fill-yellow-400 text-yellow-400" : "text-gray-300 hover:text-yellow-400",
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
                  <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center mb-3">
                    <MailOpen className="w-8 h-8 text-indigo-400" />
                  </div>
                  <div className="text-sm font-medium text-gray-600">Select a message to read</div>
                  <div className="text-xs text-gray-400 mt-1">Your conversations appear here.</div>
                </div>
              ) : (
                <div className="p-6">
                  <div className="flex items-start gap-3 mb-5">
                    <div
                      className={cn(
                        "w-11 h-11 rounded-full text-white flex items-center justify-center text-sm font-semibold overflow-hidden bg-gradient-to-br",
                        avatarGradient(selected.sender_address),
                      )}
                    >
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
                      <div className="text-xs text-gray-500 truncate">
                        {selected.sender_address} <span className="text-gray-300">→</span> {selected.recipient_address}
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5">
                        {new Date(selected.created_at).toLocaleString()}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => toggleStar(selected)}
                        className="p-2 hover:bg-gray-100 rounded-lg"
                        title={selected.is_starred ? "Unstar" : "Star"}
                      >
                        <Star
                          className={cn(
                            "w-4 h-4",
                            selected.is_starred ? "fill-yellow-400 text-yellow-400" : "text-gray-400",
                          )}
                        />
                      </button>
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
                          className="p-2 hover:bg-red-50 hover:text-red-600 rounded-lg text-gray-500"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                  <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-4 leading-snug">
                    {selected.subject || "(no subject)"}
                  </h1>
                  <div className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
                    {selected.body}
                  </div>
                  {selected.sender_address !== myAddress && (
                    <div className="mt-6 pt-4 border-t border-gray-200 flex items-center gap-2">
                      <button
                        onClick={() => setComposeOpen(true)}
                        className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-sm font-medium hover:shadow-lg hover:shadow-indigo-500/25 transition flex items-center gap-2"
                      >
                        <Reply className="w-4 h-4" /> Reply
                      </button>
                      <div className="text-[11px] text-gray-400">Only members of JENVU can be reached.</div>
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
      if (v.trim().length < 1) { setSuggest([]); return; }
      try { const r = await searchDirectory(v.trim()); setSuggest(r); } catch {}
    }, 250);
  };

  const submit = useCallback(async () => {
    if (!to.trim().endsWith("@jenvu.email")) {
      toast.error("Recipient must end with @jenvu.email");
      return;
    }
    if (!body.trim()) { toast.error("Write a message first"); return; }
    setSending(true);
    try { await onSend({ to: to.trim().toLowerCase(), subject, body }); }
    catch (e: any) { toast.error(e?.message || "Failed to send"); }
    finally { setSending(false); }
  }, [to, subject, body, onSend]);

  // ⌘/Ctrl + Enter to send, Esc to close
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") { e.preventDefault(); submit(); }
      else if (e.key === "Escape") { onClose(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [submit, onClose]);

  const wordCount = body.trim() ? body.trim().split(/\s+/).length : 0;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-2xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-200 bg-gradient-to-r from-indigo-50/60 to-purple-50/60">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center">
              <Pencil className="w-3.5 h-3.5 text-white" />
            </div>
            <div className="text-sm font-semibold text-gray-900">New message</div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-white/70 rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-5 py-4 space-y-3 flex-1 overflow-auto">
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
              <div className="absolute left-14 right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-10 max-h-56 overflow-auto">
                {suggest.map((s) => (
                  <button
                    key={s.address}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      setTo(s.address);
                      setShowSug(false);
                    }}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex justify-between"
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
        <div className="flex items-center justify-between px-5 py-3 border-t border-gray-200 bg-gray-50/50">
          <div className="text-[11px] text-gray-500 flex items-center gap-2">
            <span>{wordCount} words · {body.length} chars</span>
            <span className="text-gray-300">·</span>
            <span>Internal only</span>
          </div>
          <button
            onClick={submit}
            disabled={sending || !to.trim() || !body.trim()}
            className="px-5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-sm font-semibold disabled:opacity-40 hover:shadow-lg hover:shadow-indigo-500/25 transition flex items-center gap-2"
          >
            <Send className="w-4 h-4" /> {sending ? "Sending…" : "Send"}
          </button>
        </div>
      </div>
    </div>
  );
}
