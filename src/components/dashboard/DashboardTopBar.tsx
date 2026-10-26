import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { siteSearch, type SearchHit } from "@/lib/site-search.functions";
import { askJenvu, type AskJenvuResult } from "@/lib/ask-jenvu.functions";
import { MessageResponse } from "@/components/ai-elements/message";
import { Shimmer } from "@/components/ai-elements/shimmer";
import askJenvuMark from "@/assets/ask-jenvu-mark.png";
import GiftBox from "@/components/dashboard/GiftBox";
import { SITE_PAGES } from "@/lib/site-pages";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  BookOpen, Camera, CreditCard, Download, ExternalLink, FileText, LifeBuoy, Loader2, LogOut, Mail,
  Menu, MoreVertical, Search, SendHorizontal, Settings, ShieldCheck, Sparkles,
} from "lucide-react";
import NotificationBell from "@/components/NotificationBell";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type NavLink = { to: string; label: string };


/** Google Cloud console-style top bar: menu button, logo, page search, bell and profile menu. */
export default function DashboardTopBar({
  links,
  onMenu,
  avatarUrl,
  name,
  email,
  onSignOut,
  white = false,
}: {
  links: NavLink[];
  onMenu: () => void;
  avatarUrl: string;
  name: string;
  email: string;
  onSignOut: () => void;
  /** Pure white bar (used on the Terminal page). */
  white?: boolean;
}) {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const runSearch = useServerFn(siteSearch);
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState("");
  const runAsk = useServerFn(askJenvu);
  const [answer, setAnswer] = useState<{ q: string; res: AskJenvuResult | null } | null>(null);
  const pathname = useRouterState({ select: (st) => st.location.pathname });
  const onTerminal = pathname === "/dashboard/terminal";

  // "/" focuses the search box (as on Google Cloud), unless the user is already typing somewhere.
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey) return;
      const el = e.target as HTMLElement | null;
      if (el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName))) return;
      e.preventDefault();
      inputRef.current?.focus();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  const matches = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return [];
    const words = t.split(/\s+/).filter((w) => w.length >= 3);
    const seen = new Set<string>();
    return [...links, ...SITE_PAGES]
      .filter((l) => {
        const label = `${l.label} ${"keywords" in l ? l.keywords ?? "" : ""}`.toLowerCase();
        const hit = label.includes(t) || words.some((w) => label.includes(w));
        return hit && !seen.has(l.to) && seen.add(l.to);
      })
      .slice(0, 6);
  }, [q, links]);

  // Site-wide results (help articles, stories, web) — debounced so typing stays light.
  useEffect(() => {
    const t = q.trim();
    if (t.length < 3) { setHits([]); setSearched(""); setLoading(false); return; }
    let live = true;
    setLoading(true);
    const id = window.setTimeout(() => {
      runSearch({ data: { q: t.slice(0, 200) } })
        .then((r) => { if (live) { setHits(r.hits.slice(0, 8)); setSearched(t); } })
        .catch(() => { if (live) { setHits([]); setSearched(t); } })
        .finally(() => { if (live) setLoading(false); });
    }, 450);
    return () => { live = false; window.clearTimeout(id); };
  }, [q, runSearch]);

  // Same as the homepage search: ask Jenvu on Enter, or automatically when nothing on the site matches.
  const ask = useCallback((question: string) => {
    const t = question.trim().slice(0, 1000);
    if (!t) return;
    setAnswer({ q: t, res: null });
    runAsk({ data: { messages: [{ role: "user", content: t }] } })
      .then((res) => setAnswer((cur) => (cur && cur.q === t ? { q: t, res } : cur)))
      .catch(() => setAnswer((cur) => (cur && cur.q === t ? { q: t, res: { ok: false, error: "Ask Jenvu couldn't answer right now. Please try again in a moment." } } : cur)));
  }, [runAsk]);

  const jenvuHitCount = hits.filter((h) => h.source === "jenvu").length;
  useEffect(() => {
    const t = searched;
    if (!t || t !== q.trim() || t.length < 6) return;
    if (matches.length || jenvuHitCount) return;
    if (answer?.q === t) return;
    const id = window.setTimeout(() => ask(t), 600);
    return () => window.clearTimeout(id);
  }, [searched, q, matches.length, jenvuHitCount, answer?.q, ask]);

  const close = () => { setQ(""); setHits([]); setAnswer(null); inputRef.current?.blur(); };
  const go = (to: string) => {
    close();
    void navigate({ to: to as "/dashboard" });
  };
  const openHit = (h: SearchHit) => {
    if (h.source === "web") { window.open(h.url, "_blank", "noopener,noreferrer"); close(); }
    else go(h.url);
  };
  const seeAll = () => { const t = q.trim(); if (!t) return; close(); void navigate({ to: "/search", search: { q: t } }); };

  return (
    <header className={`sticky top-0 z-30 flex ${white ? "h-[52px]" : "h-14"} shrink-0 items-center gap-2 ${white ? "border-b border-gc-line bg-background" : "bg-gc-canvas"} px-2 sm:gap-3 sm:px-3`}>
      <button
        type="button"
        onClick={onMenu}
        aria-label="Open menu"
        className={`${onTerminal ? "hidden md:inline-flex" : "inline-flex"} h-10 w-10 shrink-0 items-center justify-center rounded-full text-gc-ink-muted hover:bg-gc-notice`}
      >
        <Menu className="h-5 w-5" />
      </button>
      <Link to="/dashboard" className="flex shrink-0 items-center gap-2 pr-2">
        <img src="/favicon.png" alt="" className="h-6 w-6 rounded-md object-contain" />
        <span className="text-[20px] font-medium tracking-tight text-gc-ink">Jenvu</span>
      </Link>

      {/* The Terminal's chart toolbar is placed here. The slot always stays mounted (hidden off the
          Terminal) so the toolbar never floats over the page while leaving the Terminal. */}
      <div id="terminal-toolbar-slot" className={onTerminal ? "hidden min-w-0 flex-1 items-center md:flex" : "hidden"} />
      {onTerminal ? null : (
      <div className={`relative mx-auto hidden w-full ${white ? "max-w-[700px]" : "max-w-[720px]"} sm:block`}>
        {/* Google Cloud style: grey pill at rest, white box with a blue outline while typing. */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (q.trim()) ask(q.trim());
          }}
          className={
            focused
              ? `flex ${white ? "h-9 rounded-lg" : "h-11 rounded-full"} items-center gap-3 border-2 border-gc-blue-deep bg-background px-3`
              : white
                ? "flex h-9 items-center gap-3 rounded-lg border border-gc-line/70 bg-gc-console-search pl-4 pr-2 shadow-sm transition hover:bg-gc-line/60"
                : "flex h-11 items-center gap-3 rounded-full border border-gc-line/70 bg-gc-notice px-3"
          }
        >
          {!(white && !focused) && <Search className={`${white ? "h-4 w-4" : "h-5 w-5"} shrink-0 text-gc-ink`} />}
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => window.setTimeout(() => setFocused(false), 150)}
            onKeyDown={(e) => { if (e.key === "Escape") close(); }}
            placeholder={focused ? "Search" : "Search (/) for pages, guides, help and more"}
            aria-label="Search"
            className="min-w-0 flex-1 bg-transparent text-[14px] text-gc-ink outline-none placeholder:text-gc-ink-muted"
          />
          {white && !focused ? (
            <button type="submit" aria-label="Search" className="inline-flex h-7 shrink-0 items-center gap-1.5 rounded-md px-2 text-[13px] text-gc-ink hover:bg-gc-notice">
              <Search className="h-4 w-4" /> Search
            </button>
          ) : (
            <button type="submit" aria-label="Send" className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-gc-ink hover:bg-gc-notice">
              {loading ? <Loader2 className="h-4 w-4 animate-spin text-gc-ink-muted" /> : <SendHorizontal className="h-5 w-5" />}
            </button>
          )}
        </form>
        {focused && !q.trim() && (
          <div onMouseDown={(e) => e.preventDefault()} className="absolute left-0 right-0 top-11 rounded-2xl border border-gc-line bg-gc-panel shadow-lg">
            <p className="px-4 py-4 text-[13px] italic text-gc-ink-muted">Do not enter any sensitive, confidential, or personal information.</p>
          </div>
        )}
        {focused && q.trim() && (
          <div
            onMouseDown={(e) => e.preventDefault()}
            className="absolute left-0 right-0 top-11 max-h-[70vh] overflow-y-auto rounded-2xl border border-gc-line bg-background py-1 shadow-lg"
          >
            {answer && answer.q === q.trim() && (
              <div className="border-b border-gc-line bg-gc-panel px-4 py-3">
                <div className="mb-2 flex items-center gap-2 text-[12px] font-medium text-gc-ink-muted">
                  Ask Jenvu
                </div>
                {answer.res === null ? (
                  <div className="flex items-center gap-2 text-[13px]">
                    <span aria-hidden className="ask-jenvu-mark-ring h-6 w-10 shrink-0" style={{ ["--mark" as string]: `url(${askJenvuMark})` }}><span className="ask-jenvu-mark-loop h-full w-full" /></span>
                    <Shimmer>Thinking about your question…</Shimmer>
                  </div>
                ) : answer.res.ok ? (
                  <div className="text-[14px] text-gc-ink"><MessageResponse>{answer.res.text}</MessageResponse></div>
                ) : (
                  <p className="text-[13px] text-gc-ink-muted">{answer.res.error}</p>
                )}
              </div>
            )}
            {matches.length > 0 && (
              <div className="py-1">
                <div className="px-4 pb-1 pt-2 text-[11px] font-medium uppercase tracking-wide text-gc-ink-muted">Pages</div>
                {matches.map((m) => (
                  <button key={m.to} type="button" onClick={() => go(m.to)} className="flex w-full items-center gap-3 px-4 py-2 text-left text-[14px] text-gc-ink hover:bg-gc-canvas">
                    <FileText className="h-4 w-4 shrink-0 text-gc-ink-muted" />
                    <span className="truncate">{m.label}</span>
                  </button>
                ))}
              </div>
            )}
            {hits.length > 0 && (
              <div className="border-t border-gc-line py-1 first:border-t-0">
                <div className="px-4 pb-1 pt-2 text-[11px] font-medium uppercase tracking-wide text-gc-ink-muted">Results</div>
                {hits.map((h) => (
                  <button key={h.url} type="button" onClick={() => openHit(h)} className="block w-full px-4 py-2 text-left hover:bg-gc-canvas">
                    <span className="flex items-center gap-1.5 text-[11px] text-gc-ink-muted">
                      <span className="truncate">{h.path.join(" › ")}</span>
                      {h.source === "web" && <ExternalLink className="h-3 w-3 shrink-0" />}
                    </span>
                    <span className="block truncate text-[14px] font-medium text-gc-blue">{h.title}</span>
                    {h.description && <span className="line-clamp-2 text-[12px] text-gc-ink-muted">{h.description}</span>}
                  </button>
                ))}
              </div>
            )}
            {loading && (
              <div className="flex items-center gap-2 px-4 py-3 text-[13px] text-gc-ink-muted">
                <Loader2 className="h-4 w-4 animate-spin" /> Searching the site…
              </div>
            )}
            {!loading && matches.length === 0 && hits.length === 0 && !(answer && answer.q === q.trim()) && (
              <div className="px-4 py-3 text-[13px] text-gc-ink-muted">
                {q.trim().length < 3 ? "Keep typing to search the whole site…" : "No matches yet. Press Enter to ask Jenvu."}
              </div>
            )}
            <div className="flex items-center justify-between gap-2 border-t border-gc-line px-4 py-2.5 text-[13px]">
              {!(answer && answer.q === q.trim()) ? (
                <button type="button" onClick={() => ask(q)} className="inline-flex min-w-0 items-center gap-1.5 text-gc-blue hover:underline">
                  <Sparkles className="h-3.5 w-3.5 shrink-0" /> <span className="truncate">Ask Jenvu about “{q.trim().length > 40 ? `${q.trim().slice(0, 40)}…` : q.trim()}”</span>
                </button>
              ) : <span />}
              <button type="button" onClick={seeAll} className="shrink-0 text-gc-blue hover:underline">See all results</button>
            </div>
          </div>
        )}
      </div>
      )}

      <div className="ml-auto flex shrink-0 items-center gap-1 sm:ml-0">
        {onTerminal && (
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent("jenvu:terminal-ask-ai"))}
            aria-label="Ask Jenvu"
            title="Ask Jenvu"
            className="inline-flex h-9 items-center gap-2 rounded-full bg-gc-sky px-2.5 text-[13px] font-medium text-gc-blue-deep hover:brightness-95 sm:px-3.5"
          >
            <img src={askJenvuMark} alt="" className="h-3.5 w-auto shrink-0" />
            <span className="hidden lg:inline">Ask Jenvu</span>
          </button>
        )}
        <GiftBox />
        <NotificationBell />
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label="More"
              title="More"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full text-gc-ink-muted hover:bg-gc-notice"
            >
              <MoreVertical className="h-[19px] w-[19px] shrink-0 text-gc-ink-muted" strokeWidth={1.75} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-60 rounded-2xl py-2 pl-0 pr-2">
            <DropdownMenuItem asChild>
              <Link to="/docs" className="cursor-pointer gap-3.5 rounded-r-full py-2 pl-4 pr-3 text-[14px] font-normal text-gc-ink focus:bg-gc-notice"><BookOpen className="h-[19px] w-[19px] shrink-0 text-gc-ink-muted" strokeWidth={1.75} /> Docs</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/help" className="cursor-pointer gap-3.5 rounded-r-full py-2 pl-4 pr-3 text-[14px] font-normal text-gc-ink focus:bg-gc-notice"><LifeBuoy className="h-[19px] w-[19px] shrink-0 text-gc-ink-muted" strokeWidth={1.75} /> Help center</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/pricing" className="cursor-pointer gap-3.5 rounded-r-full py-2 pl-4 pr-3 text-[14px] font-normal text-gc-ink focus:bg-gc-notice"><CreditCard className="h-[19px] w-[19px] shrink-0 text-gc-ink-muted" strokeWidth={1.75} /> Pricing</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/download" className="cursor-pointer gap-3.5 rounded-r-full py-2 pl-4 pr-3 text-[14px] font-normal text-gc-ink focus:bg-gc-notice"><Download className="h-[19px] w-[19px] shrink-0 text-gc-ink-muted" strokeWidth={1.75} /> Download extension</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/contact" className="cursor-pointer gap-3.5 rounded-r-full py-2 pl-4 pr-3 text-[14px] font-normal text-gc-ink focus:bg-gc-notice"><Mail className="h-[19px] w-[19px] shrink-0 text-gc-ink-muted" strokeWidth={1.75} /> Contact us</Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label="Account menu"
              className="ml-1 inline-flex h-9 w-9 items-center justify-center overflow-hidden rounded-full ring-1 ring-gc-line hover:ring-2 hover:ring-gc-blue-soft"
            >
              <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64 rounded-2xl py-2 pl-0 pr-2">
            <DropdownMenuLabel className="flex items-center gap-3 px-3 py-3 font-normal">
              <img src={avatarUrl} alt="" className="h-10 w-10 rounded-full object-cover" />
              <div className="min-w-0">
                <div className="truncate text-[14px] font-medium text-gc-ink">{name || "Your account"}</div>
                <div className="truncate text-[12px] text-gc-ink-muted">{email}</div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link to="/dashboard/profile" className="cursor-pointer gap-3.5 rounded-r-full py-2 pl-4 pr-3 text-[14px] font-normal text-gc-ink focus:bg-gc-notice">
                <Camera className="h-[19px] w-[19px] shrink-0 text-gc-ink-muted" strokeWidth={1.75} /> Change profile photo
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/dashboard/profile" className="cursor-pointer gap-3.5 rounded-r-full py-2 pl-4 pr-3 text-[14px] font-normal text-gc-ink focus:bg-gc-notice">
                <Settings className="h-[19px] w-[19px] shrink-0 text-gc-ink-muted" strokeWidth={1.75} /> Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/dashboard/security" className="cursor-pointer gap-3.5 rounded-r-full py-2 pl-4 pr-3 text-[14px] font-normal text-gc-ink focus:bg-gc-notice">
                <ShieldCheck className="h-[19px] w-[19px] shrink-0 text-gc-ink-muted" strokeWidth={1.75} /> Security
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => onSignOut()} className="cursor-pointer gap-3.5 rounded-r-full py-2 pl-4 pr-3 text-[14px] font-normal text-gc-ink focus:bg-gc-notice">
              <LogOut className="h-[19px] w-[19px] shrink-0 text-gc-ink-muted" strokeWidth={1.75} /> Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
