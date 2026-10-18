import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { siteSearch, type SearchHit } from "@/lib/site-search.functions";
import { Link, useNavigate } from "@tanstack/react-router";
import { Camera, ExternalLink, FileText, Loader2, LogOut, Menu, Search, Settings, ShieldCheck } from "lucide-react";
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

/** Public site pages the dashboard search can jump to, with extra words people may type. */
const SITE_PAGES: (NavLink & { keywords?: string })[] = [
  { to: "/", label: "Home", keywords: "homepage start jenvu" },
  { to: "/about", label: "Overview", keywords: "about company story team" },
  { to: "/strategies/ict-gold-trading", label: "Solutions", keywords: "ict smc strategy gold trading" },
  { to: "/ai-engine", label: "Products", keywords: "ai engine features terminal api" },
  { to: "/pricing", label: "Pricing", keywords: "plans price pro elite ultra buy upgrade cost" },
  { to: "/insights", label: "Blog", keywords: "articles insights news posts" },
  { to: "/help", label: "Support", keywords: "help center support guides faq questions" },
  { to: "/docs", label: "Docs", keywords: "documentation api reference developers" },
  { to: "/contact", label: "Contact us", keywords: "contact sales email phone support team live chat message" },
  { to: "/founding", label: "Founding Program", keywords: "founding apply application invite" },
  { to: "/founder", label: "Founder", keywords: "founder ceo" },
  { to: "/killzones", label: "Killzones", keywords: "sessions london new york asia times" },
  { to: "/scam-check", label: "Scam Check", keywords: "scam fraud check broker safety" },
  { to: "/download", label: "Download", keywords: "extension app install chrome mobile" },
  { to: "/terms", label: "Terms of service", keywords: "terms legal conditions" },
  { to: "/privacy", label: "Privacy policy", keywords: "privacy data cookies gdpr" },
  { to: "/refund", label: "Refund policy", keywords: "refund money back" },
  { to: "/cancellation", label: "Cancellation policy", keywords: "cancel subscription" },
  { to: "/disclaimer", label: "Risk disclaimer", keywords: "risk disclaimer warning" },
];

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
    if (t.length < 3) { setHits([]); setLoading(false); return; }
    let live = true;
    setLoading(true);
    const id = window.setTimeout(() => {
      runSearch({ data: { q: t.slice(0, 200) } })
        .then((r) => { if (live) setHits(r.hits.slice(0, 8)); })
        .catch(() => { if (live) setHits([]); })
        .finally(() => { if (live) setLoading(false); });
    }, 450);
    return () => { live = false; window.clearTimeout(id); };
  }, [q, runSearch]);

  const close = () => { setQ(""); setHits([]); inputRef.current?.blur(); };
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
    <header className={`sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 ${white ? "bg-gc-console-bar" : "bg-gc-canvas"} px-2 sm:gap-3 sm:px-3`}>
      <button
        type="button"
        onClick={onMenu}
        aria-label="Open menu"
        className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-gc-ink-muted hover:bg-gc-notice"
      >
        <Menu className="h-5 w-5" />
      </button>
      <Link to="/dashboard" className="flex shrink-0 items-center gap-2 pr-2">
        <img src="/favicon.png" alt="" className="h-6 w-6 rounded-md object-contain" />
        <span className="text-[20px] font-medium tracking-tight text-gc-ink">Jenvu</span>
      </Link>

      <div className="relative mx-auto hidden w-full max-w-[720px] sm:block">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (matches[0]) go(matches[0].to);
            else if (hits[0]) openHit(hits[0]);
            else seeAll();
          }}
          className={`flex items-center rounded-full border ${white ? "h-9 border-gc-line/70 bg-gc-console-search" : "h-10 border-gc-line bg-gc-notice"} pl-4 pr-1 focus-within:bg-background focus-within:shadow-sm`}
        >
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => window.setTimeout(() => setFocused(false), 150)}
            placeholder="Search Jenvu, guides and the web"
            aria-label="Search"
            className="min-w-0 flex-1 bg-transparent text-[14px] text-gc-ink outline-none placeholder:text-gc-ink-muted"
          />
          <button
            type="submit"
            className="inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[14px] text-gc-ink hover:bg-gc-line/50"
          >
            <Search className="h-4 w-4" />
            Search
          </button>
        </form>
        {focused && q.trim() && (
          <div
            onMouseDown={(e) => e.preventDefault()}
            className="absolute left-0 right-0 top-12 max-h-[70vh] overflow-y-auto rounded-2xl border border-gc-line bg-background py-1 shadow-lg"
          >
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
            {!loading && matches.length === 0 && hits.length === 0 && (
              <div className="px-4 py-3 text-[13px] text-gc-ink-muted">
                {q.trim().length < 3 ? "Keep typing to search the whole site…" : `No results for "${q.trim()}"`}
              </div>
            )}
            <button type="button" onClick={seeAll} className="flex w-full items-center gap-2 border-t border-gc-line px-4 py-2.5 text-left text-[13px] text-gc-blue hover:bg-gc-canvas">
              <Search className="h-4 w-4" /> See all results for "{q.trim()}"
            </button>
          </div>
        )}
      </div>

      <div className="ml-auto flex shrink-0 items-center gap-1 sm:ml-0">
        <NotificationBell />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label="Account menu"
              className="ml-1 inline-flex h-9 w-9 items-center justify-center overflow-hidden rounded-full ring-1 ring-gc-line hover:ring-2 hover:ring-gc-blue-soft"
            >
              <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64 rounded-2xl p-1">
            <DropdownMenuLabel className="flex items-center gap-3 px-3 py-3 font-normal">
              <img src={avatarUrl} alt="" className="h-10 w-10 rounded-full object-cover" />
              <div className="min-w-0">
                <div className="truncate text-[14px] font-medium text-gc-ink">{name || "Your account"}</div>
                <div className="truncate text-[12px] text-gc-ink-muted">{email}</div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link to="/dashboard/profile" className="cursor-pointer gap-2">
                <Camera className="h-4 w-4" /> Change profile photo
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/dashboard/profile" className="cursor-pointer gap-2">
                <Settings className="h-4 w-4" /> Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/dashboard/security" className="cursor-pointer gap-2">
                <ShieldCheck className="h-4 w-4" /> Security
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => onSignOut()} className="cursor-pointer gap-2">
              <LogOut className="h-4 w-4" /> Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
