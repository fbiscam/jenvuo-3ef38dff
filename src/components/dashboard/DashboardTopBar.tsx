import { useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Camera, LogOut, Menu, Search, Settings, ShieldCheck } from "lucide-react";
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

  const matches = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return [];
    return links.filter((l) => l.label.toLowerCase().includes(t)).slice(0, 6);
  }, [q, links]);

  const go = (to: string) => {
    setQ("");
    inputRef.current?.blur();
    void navigate({ to: to as "/dashboard" });
  };

  return (
    <header className={`sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 ${white ? "bg-background" : "bg-gc-canvas"} px-2 sm:gap-3 sm:px-3`}>
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
          }}
          className="flex h-10 items-center rounded-full border border-gc-line bg-gc-notice pl-4 pr-1 focus-within:bg-background focus-within:shadow-sm"
        >
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => window.setTimeout(() => setFocused(false), 150)}
            placeholder="Search pages, settings and tools"
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
          <div className="absolute left-0 right-0 top-12 overflow-hidden rounded-2xl border border-gc-line bg-background py-1 shadow-lg">
            {matches.length === 0 ? (
              <div className="px-4 py-3 text-[13px] text-gc-ink-muted">No pages match "{q}"</div>
            ) : (
              matches.map((m) => (
                <button
                  key={m.to}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => go(m.to)}
                  className="block w-full px-4 py-2 text-left text-[14px] text-gc-ink hover:bg-gc-canvas"
                >
                  {m.label}
                </button>
              ))
            )}
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
