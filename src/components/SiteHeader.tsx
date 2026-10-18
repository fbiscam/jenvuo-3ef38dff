import * as React from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Menu, Search, SendHorizontal, X } from "lucide-react";
import { useAuthUser } from "@/hooks/useAuthUser";

/** Current page in the top menu: dark text with a blue line along the bottom of the header. */
const ACTIVE = { className: "relative !text-gc-ink after:pointer-events-none after:absolute after:inset-x-1 after:-bottom-[13px] after:h-[3px] after:rounded-t-sm after:bg-gc-blue" };

const MONO = "font-['JetBrains_Mono',ui-monospace,monospace]";

/** The homepage header, shared by every public page so the menu is identical everywhere. */
export default function SiteHeader() {
  const { user: authUser } = useAuthUser();
  const isAuthed = !!authUser;
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [searchOpen, setSearchOpen] = React.useState(false);
  const [searchText, setSearchText] = React.useState("");
  const navigate = useNavigate();
  React.useEffect(() => {
    if (mobileMenuOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = prev; };
    }
  }, [mobileMenuOpen]);
  return (
    <>
      <header className="jenvu-home-header sticky top-0 z-50 border-0 bg-background">
        {searchOpen && (
          <div className="absolute inset-x-0 top-0 z-[70] flex items-start gap-3 bg-background px-4 py-1.5">
            <div className="relative mx-auto w-full max-w-[1000px]">
              <form
                onSubmit={(e) => { e.preventDefault(); const q = searchText.trim(); if (q) { setSearchOpen(false); navigate({ to: "/search", search: { q } }); } }}
                className="flex h-12 items-center gap-3 rounded-lg border-2 border-gc-blue-deep bg-background px-4"
              >
                <Search className="h-5 w-5 text-gc-ink" />
                <input autoFocus value={searchText} onChange={(e) => setSearchText(e.target.value)} onKeyDown={(e) => e.key === "Escape" && setSearchOpen(false)} placeholder="Search" className="flex-1 bg-transparent text-[16px] text-gc-ink outline-none" />
                <button type="submit" aria-label="Search" className="text-gc-ink-muted hover:text-gc-ink"><SendHorizontal className="h-5 w-5" /></button>
                <button type="button" aria-label="Close search" onClick={() => setSearchOpen(false)} className="text-gc-ink-muted hover:text-gc-ink"><X className="h-5 w-5" /></button>
              </form>
              <div className="absolute inset-x-0 top-full rounded-b-lg bg-gc-panel px-4 py-4 text-[13px] italic text-gc-ink-muted shadow-md">
                Ask about Jenvu or anything else. Do not enter any sensitive, confidential, or personal information.
              </div>
            </div>
          </div>
        )}
        <div className="relative flex items-center gap-3 px-4 py-2.5 sm:px-4">
          <Link to="/" className="flex min-w-0 shrink-0 items-center gap-2">
            <img src="/favicon.png" alt="Jenvu" className="h-7 w-7 shrink-0 rounded-md object-contain" />
            <span className="truncate text-[22px] leading-none tracking-tight text-gc-ink" style={{ fontFamily: "\"Google Sans\", \"Product Sans\", \"DM Sans\", system-ui, sans-serif", fontWeight: 500 }}>Jenvu</span>
          </Link>

          <nav className="ml-6 hidden min-w-0 items-center gap-0.5 whitespace-nowrap text-[14px] text-gc-ink-muted lg:flex [&>a]:rounded-md [&>a]:px-2.5 [&>a]:py-2 [&>a:hover]:bg-gc-surface [&>a:hover]:text-gc-ink">
            <Link to="/about" activeProps={ACTIVE}>Overview</Link>
            <Link to="/strategies/ict-gold-trading" activeProps={ACTIVE}>Solutions</Link>
            <Link to="/ai-engine" activeProps={ACTIVE}>Products</Link>
            <Link to="/pricing" activeProps={ACTIVE}>Pricing</Link>
            <Link to="/insights" activeProps={ACTIVE}>Blog</Link>
            <Link to="/contact" className="!text-gc-blue" activeProps={ACTIVE}>Contact us</Link>
          </nav>

          <div className="ml-auto flex shrink-0 items-center gap-1">
            <button type="button" onClick={() => setSearchOpen(true)} aria-label="Search" className="hidden h-10 w-10 items-center justify-center rounded-full text-gc-ink-muted hover:bg-gc-surface md:inline-flex">
              <Search className="h-5 w-5" />
            </button>
            <div className="hidden items-center whitespace-nowrap text-[14px] md:flex [&>a]:rounded-md [&>a]:px-2.5 [&>a]:py-2 [&>a:hover]:bg-gc-surface">
              <Link to="/docs" className="text-gc-ink-muted hover:text-gc-ink">Docs</Link>
              <a href="https://support.jenvu.com" className="text-gc-ink-muted hover:text-gc-ink">Support</a>
              <Link to="/dashboard/terminal" className="text-gc-blue">Terminal</Link>
            </div>
            {isAuthed ? (
              <Link
                to="/dashboard"
                className="ml-2 inline-flex h-10 items-center justify-center rounded-full bg-gc-blue px-4 text-[14px] font-medium text-gc-on-blue hover:bg-gc-blue-hover"
              >
                Dashboard
              </Link>
            ) : (
              <>
                <Link to="/auth" className="ml-1 hidden whitespace-nowrap rounded-md px-2.5 py-2 text-[14px] text-gc-ink-muted hover:bg-gc-surface hover:text-gc-ink xl:inline-flex">
                  Sign in
                </Link>
                <Link
                  to="/auth"
                  search={{ mode: "signup" } as never}
                  className="ml-2 inline-flex h-10 items-center justify-center rounded-full bg-gc-blue px-4 text-[14px] font-medium text-gc-on-blue hover:bg-gc-blue-hover"
                >
                  Start free
                </Link>
              </>
            )}
            <button
              type="button"
              aria-label="Open menu"
              aria-expanded={mobileMenuOpen}
              onClick={() => setMobileMenuOpen(true)}
              className="ml-1 inline-flex h-10 w-10 items-center justify-center rounded-full text-gc-ink hover:bg-gc-surface lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      {mobileMenuOpen && (
        <div className="fixed inset-0 z-[60] lg:hidden" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-zinc-900/40" onClick={() => setMobileMenuOpen(false)} />
          <div className="absolute inset-x-0 top-0 bg-white border-b border-zinc-100 shadow-lg">
            <div className="flex items-center justify-between px-5 py-3">
              <Link to="/" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-2.5">
                <img src="/favicon.png" alt="Jenvu" className="h-7 w-7 rounded-md object-contain" />
                <span className="text-[20px] tracking-tight" style={{ color: "#3c4043", fontFamily: "\"Google Sans\",\"Product Sans\",\"DM Sans\",system-ui,sans-serif", fontWeight: 500 }}>Jenvu</span>
              </Link>
              <button
                type="button"
                aria-label="Close menu"
                onClick={() => setMobileMenuOpen(false)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-900 hover:bg-zinc-50"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <nav className="flex flex-col px-3 pb-4 pt-1 text-[15px] text-zinc-900">
              {[
                { to: "/about", label: "Overview" },
                { to: "/strategies/ict-gold-trading", label: "Solutions" },
                { to: "/ai-engine", label: "Products" },
                { to: "/pricing", label: "Pricing" },
                { to: "/insights", label: "Resources" },
                { to: "/docs", label: "Docs" },
                { to: "/contact", label: "Contact us" },
              ].map((it) => (

                <Link
                  key={it.to}
                  to={it.to}
                  onClick={() => setMobileMenuOpen(false)}
                  className="rounded-lg px-3 py-3 hover:bg-zinc-50"
                >
                  {it.label}
                </Link>
              ))}
              {isAuthed ? (
                <Link
                  to="/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className="mx-3 mt-3 inline-flex items-center justify-center rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-sm font-medium text-zinc-950 hover:bg-zinc-50"
                >
                  Dashboard
                  <span className={`${MONO} text-[10px] opacity-70 ml-1.5`}>↗</span>
                </Link>
              ) : (
                <div className="mt-2 grid grid-cols-2 gap-2 px-3">
                  <Link
                    to="/auth"
                    onClick={() => setMobileMenuOpen(false)}
                    className="inline-flex items-center justify-center rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 hover:bg-zinc-50"
                  >
                    Sign In
                  </Link>
                  <Link
                    to="/pricing"
                    onClick={() => setMobileMenuOpen(false)}
                    className="inline-flex items-center justify-center rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-950 hover:bg-zinc-50"
                  >
                    Buy now
                  </Link>
                </div>
              )}
            </nav>
          </div>
        </div>
      )}
    </>
  );
}
