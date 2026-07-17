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
  MoreVertical,
  ChevronDown,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getMyMailAddress,
  claimMailAddress,
  checkUsernameAvailable,
  listMail,
  listMyMailAddresses,
  sendMail,
  setMailState,
  searchMailDirectory,
  getMailBadges,
  type MailFolder,
  type MailListItem,
  type MailBadgeTier,
  type MailAddress,
} from "@/lib/mail.functions";
import { VerifiedBadge } from "@/components/VerifiedBadge";


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
  const _listAddrs = useServerFn(listMyMailAddresses);
  const _claim = useServerFn(claimMailAddress);
  const _check = useServerFn(checkUsernameAvailable);
  const _list = useServerFn(listMail);
  const _send = useServerFn(sendMail);
  const _setState = useServerFn(setMailState);
  const _search = useServerFn(searchMailDirectory);
  const _badges = useServerFn(getMailBadges);

  const [myAddress, setMyAddress] = useState<string | null>(null);
  const [myAddresses, setMyAddresses] = useState<MailAddress[]>([]);
  const [activeAddress, setActiveAddress] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem("mail:active_address");
  });
  const [addrSwitchOpen, setAddrSwitchOpen] = useState(false);
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
  const [badges, setBadges] = useState<Record<string, MailBadgeTier>>({});
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectMenuOpen, setSelectMenuOpen] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [addr, addrs, rows] = await Promise.all([
        _getAddr({}),
        _listAddrs({}).catch(() => [] as MailAddress[]),
        _list({ data: { folder } }).catch(() => []),
      ]);
      const primary = (addr as any)?.address ?? null;
      setMyAddress(primary);
      setMyAddresses(addrs as MailAddress[]);
      setActiveAddress((prev) => {
        if (prev && (addrs as MailAddress[]).some((a) => a.address === prev)) return prev;
        return primary;
      });
      setMessages(rows as MailListItem[]);
    } finally {
      setLoading(false);
      setReady(true);
    }
  }, [folder, _getAddr, _listAddrs, _list]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (activeAddress && typeof window !== "undefined") {
      window.localStorage.setItem("mail:active_address", activeAddress);
    }
  }, [activeAddress]);


  // Fetch verification badges for every address currently on screen
  useEffect(() => {
    const addrs = new Set<string>();
    for (const m of messages) {
      if (m.sender_address) addrs.add(m.sender_address.toLowerCase());
      if (m.recipient_address) addrs.add(m.recipient_address.toLowerCase());
    }
    if (myAddress) addrs.add(myAddress.toLowerCase());
    const list = Array.from(addrs).filter((a) => !(a in badges));
    if (!list.length) return;
    _badges({ data: { addresses: list } })
      .then((m) => setBadges((prev) => ({ ...prev, ...m })))
      .catch(() => {});
  }, [messages, myAddress, _badges, badges]);


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
    // Scope to the selected mailbox when the user owns more than one
    if (activeAddress && myAddresses.length > 1) {
      const a = activeAddress.toLowerCase();
      list = list.filter((m) =>
        folder === "sent"
          ? m.sender_address?.toLowerCase() === a
          : m.recipient_address?.toLowerCase() === a,
      );
    }
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
  }, [messages, query, view, activeAddress, myAddresses, folder]);

  const unreadCount = messages.filter((m) => {
    if (m.is_read || m.folder !== "inbox") return false;
    if (activeAddress && myAddresses.length > 1) {
      return m.recipient_address?.toLowerCase() === activeAddress.toLowerCase();
    }
    return true;
  }).length;


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

  const toggleSelectOne = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const clearSelection = () => setSelectedIds(new Set());
  const selectAllVisible = () => setSelectedIds(new Set(filtered.map((m) => m.message_id)));
  const selectByPredicate = (pred: (m: MailListItem) => boolean) =>
    setSelectedIds(new Set(filtered.filter(pred).map((m) => m.message_id)));

  const allVisibleSelected =
    filtered.length > 0 && filtered.every((m) => selectedIds.has(m.message_id));
  const someSelected = selectedIds.size > 0;

  const bulkMarkRead = async () => {
    const ids = Array.from(selectedIds);
    try {
      await Promise.all(
        ids.map((id) => _setState({ data: { message_id: id, is_read: true } })),
      );
      setMessages((prev) =>
        prev.map((x) => (selectedIds.has(x.message_id) ? { ...x, is_read: true } : x)),
      );
      toast.success(`Marked ${ids.length} as read`);
      clearSelection();
    } catch (e: any) {
      toast.error(e?.message || "Failed");
    }
  };

  const bulkMove = async (target: MailFolder) => {
    const ids = Array.from(selectedIds);
    try {
      await Promise.all(
        ids.map((id) => _setState({ data: { message_id: id, folder: target } })),
      );
      setMessages((prev) => prev.filter((x) => !selectedIds.has(x.message_id)));
      if (selected && selectedIds.has(selected.message_id)) setSelected(null);
      toast.success(`${ids.length} ${target === "trash" ? "deleted" : "moved to " + target}`);
      clearSelection();
    } catch (e: any) {
      toast.error(e?.message || "Failed");
    }
  };

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
    <div className="h-[calc(100vh-4rem)] lg:h-[calc(100vh-7rem)] bg-white overflow-hidden">
      <div className="max-w-[1400px] mx-auto flex flex-col lg:flex-row gap-0 lg:gap-4 lg:p-4 h-full min-h-0">

        {/* Sidebar */}
        <aside className="lg:w-56 shrink-0 lg:sticky lg:top-0 lg:self-start h-auto lg:h-full lg:max-h-none overflow-y-auto px-3 py-4 lg:p-0 z-10 shrink-0">
          <button
            onClick={() => setComposeOpen(true)}
            className="w-full flex items-center gap-2 justify-center bg-white text-gray-900 border border-gray-200 shadow-[0_1px_3px_rgba(0,0,0,0.06)] rounded-full py-3 text-sm font-medium hover:shadow-md hover:bg-gray-50 transition mb-6"
          >
            <Pencil className="w-4 h-4 text-gray-700" /> Compose
          </button>

          {myAddresses.length > 1 && (
            <div className="relative mb-4">
              <button
                onClick={() => setAddrSwitchOpen((v) => !v)}
                className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-left"
              >
                <div className="min-w-0">
                  <div className="text-[10px] uppercase tracking-wide text-gray-400">Mailbox</div>
                  <div className="text-sm text-gray-900 truncate">{activeAddress}</div>
                </div>
                <svg className={`w-4 h-4 text-gray-500 transition ${addrSwitchOpen ? "rotate-180" : ""}`} viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.06l3.71-3.83a.75.75 0 111.08 1.04l-4.25 4.39a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z" clipRule="evenodd"/></svg>
              </button>
              {addrSwitchOpen && (
                <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
                  {myAddresses.map((a) => (
                    <button
                      key={a.address}
                      onClick={() => { setActiveAddress(a.address); setAddrSwitchOpen(false); setSelected(null); }}
                      className={`w-full text-left px-3 py-2 text-sm flex items-center justify-between hover:bg-gray-50 ${activeAddress === a.address ? "bg-gray-50" : ""}`}
                    >
                      <span className="truncate">{a.address}</span>
                      {a.is_primary && <span className="text-[10px] text-gray-400 ml-2">primary</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

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
        </aside>

        {/* Main */}
        <section className="flex-1 min-w-0 min-h-0 border-x-0 lg:border lg:border-gray-200 lg:rounded-2xl overflow-hidden bg-white h-full flex flex-col">
          {/* Header */}
          <div className="px-4 pt-4 pb-3 border-b border-gray-100 lg:shrink-0">
            <div className="flex items-center gap-1 mb-3">
              {selected && (
                <button onClick={() => setSelected(null)} className="lg:hidden p-1.5 hover:bg-gray-100 rounded">
                  <ArrowLeft className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={() => {
                  if (allVisibleSelected || someSelected) clearSelection();
                  else selectAllVisible();
                }}
                className="p-1.5 hover:bg-gray-100 rounded-md text-gray-500 mt-1"
                title="Select all"
              >
                <span
                  className={cn(
                    "w-4 h-4 rounded border-2 inline-flex items-center justify-center mt-0.5",
                    someSelected ? "bg-blue-600 border-blue-600 text-white" : "border-gray-300",
                  )}

                >
                  {allVisibleSelected ? (
                    <Check className="w-3 h-3" strokeWidth={3} />
                  ) : someSelected ? (
                    <span className="w-2 h-0.5 bg-white rounded" />
                  ) : null}
                </span>
              </button>
              {someSelected ? (
                <>
                  <div className="w-px h-5 bg-gray-200 mx-1" />
                  <button
                    onClick={() => bulkMove("trash")}
                    className="p-1.5 hover:bg-gray-100 rounded-md text-gray-600"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={bulkMarkRead}
                    className="p-1.5 hover:bg-gray-100 rounded-md text-gray-600"
                    title="Mark as read"
                  >
                    <MailOpen className="w-4 h-4" />
                  </button>
                  {folder !== "archive" && (
                    <button
                      onClick={() => bulkMove("archive")}
                      className="p-1.5 hover:bg-gray-100 rounded-md text-gray-600"
                      title="Archive"
                    >
                      <Archive className="w-4 h-4" />
                    </button>
                  )}
                  <span className="ml-2 text-xs text-gray-500">{selectedIds.size} selected</span>
                </>
              ) : (
                <>
                  <button

                    onClick={() => load()}
                    className="p-1.5 hover:bg-gray-100 rounded-md text-gray-500"
                    title="Refresh"
                  >
                    <RefreshCcw className="w-4 h-4" />
                  </button>
                  <div className="relative">
                    <button
                      onClick={() => setMoreMenuOpen((v) => !v)}
                      className="p-1.5 hover:bg-gray-100 rounded-md text-gray-500"
                      title="More"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>
                    {moreMenuOpen && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setMoreMenuOpen(false)} />
                        <div className="absolute left-0 top-full mt-1 z-20 bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-[180px] text-sm">
                          {[
                            {
                              label: "Mark all as read",
                              fn: async () => {
                                const ids = filtered.filter((m) => !m.is_read).map((m) => m.message_id);
                                if (!ids.length) { toast.info("Nothing to mark"); return; }
                                try {
                                  await Promise.all(ids.map((id) => _setState({ data: { message_id: id, is_read: true } })));
                                  setMessages((prev) => prev.map((x) => ids.includes(x.message_id) ? { ...x, is_read: true } : x));
                                  toast.success(`Marked ${ids.length} as read`);
                                } catch (e: any) { toast.error(e?.message || "Failed"); }
                              },
                            },
                            { label: "Select all", fn: () => selectAllVisible() },
                            { label: "Refresh", fn: () => load() },
                          ].map((o) => (
                            <button
                              key={o.label}
                              onClick={() => { o.fn(); setMoreMenuOpen(false); }}
                              className="w-full text-left px-3 py-1.5 hover:bg-gray-50 text-gray-700"
                            >
                              {o.label}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </>
              )}
            </div>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search mail"
                className="w-full pl-11 pr-4 py-2.5 text-sm rounded-full bg-gray-100 focus:bg-white focus:ring-1 focus:ring-gray-300 outline-none border border-transparent transition"
              />
            </div>
          </div>

          {/* Split view */}
          <div className="grid lg:grid-cols-[380px_1fr] flex-1 min-h-0 overflow-hidden">
            {/* List */}
            <div
              className={cn("border-r border-gray-200 overflow-y-auto min-h-0 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden", selected ? "hidden lg:block" : "block")}
            >


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
                      <li key={m.message_id} className={cn(selectedIds.has(m.message_id) && "bg-blue-50")}>
                        <div
                          onClick={() => openMessage(m)}
                          className={cn(
                            "w-full text-left px-4 py-3 border-b border-gray-100 flex gap-3 items-start hover:bg-gray-50 transition cursor-pointer",
                            active && "bg-gray-100",
                            !m.is_read && folder === "inbox" && !selectedIds.has(m.message_id) && "bg-blue-50/40",
                            selectedIds.has(m.message_id) && "bg-blue-50 hover:bg-blue-50",
                          )}
                        >
                          <span
                            role="checkbox"
                            aria-checked={selectedIds.has(m.message_id)}
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleSelectOne(m.message_id);
                            }}
                            className={cn(
                              "mt-1 w-4 h-4 rounded border-2 inline-flex items-center justify-center shrink-0 cursor-pointer",
                              selectedIds.has(m.message_id)
                                ? "bg-blue-600 border-blue-600 text-white"
                                : "border-gray-300 hover:border-gray-500 bg-white",
                            )}
                          >
                            {selectedIds.has(m.message_id) && <Check className="w-3 h-3" strokeWidth={3} />}
                          </span>
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
                              <VerifiedBadge
                                tier={badges[(folder === "sent" ? m.recipient_address : m.sender_address)?.toLowerCase?.() ?? ""]}
                                size={13}
                              />
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
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {/* Detail */}
            <div className={cn("bg-white overflow-y-auto min-h-0", !selected ? "hidden lg:block" : "block")}>
              {!selected ? (
                <div className="h-full min-h-[400px] flex flex-col items-center justify-center p-12 text-center">
                  <div className="w-20 h-20 rounded-full border border-gray-200 flex items-center justify-center mb-4">
                    <InboxIcon className="w-8 h-8 text-blue-600" strokeWidth={2} />
                  </div>
                  <div className="text-lg font-semibold text-gray-900 mb-1">No conversation selected</div>
                  <div className="text-sm text-gray-500">Pick a message from the list to read it here.</div>
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
                      <div className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
                        <span className="truncate">{selected.sender_name || selected.sender_address}</span>
                        <VerifiedBadge tier={badges[selected.sender_address?.toLowerCase() ?? ""]} size={15} />
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
                  {!myAddresses.some((a) => a.address === selected.sender_address) && (
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
          myAddress={activeAddress ?? myAddress}
          replyTo={selected && !myAddresses.some((a) => a.address === selected.sender_address) ? selected : null}
          onSend={async ({ to, subject, body }) => {
            await _send({ data: { to, subject, body, from: activeAddress ?? undefined } });
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
