import * as React from "react";
import { Link } from "@tanstack/react-router";
import { ChevronDown, Menu, Search, X } from "lucide-react";
import { openAskJenvu } from "@/components/AskJenvuWidget";
import HeaderSearch from "@/components/HeaderSearch";
import JenvuMark from "@/components/JenvuMark";
import { useAuthUser } from "@/hooks/useAuthUser";
import { supabase } from "@/integrations/supabase/client";
import { readCachedAvatar, writeCachedAvatar, AVATAR_TTL_SECONDS } from "@/lib/avatar-cache";
import { getDefaultAvatar } from "@/lib/default-avatar";

/** Current page in the top menu: dark text with a blue line along the bottom of the header. */
const ACTIVE = { className: "!bg-muted !text-foreground" };

const MONO = "font-sans";

/** The homepage header, shared by every public page so the menu is identical everywhere. */
export default function SiteHeader() {
  const { user: authUser } = useAuthUser();
  const isAuthed = !!authUser;
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [searchOpen, setSearchOpen] = React.useState(false);
  const [tryOpen, setTryOpen] = React.useState(false);
  const closeSearch = React.useCallback(() => setSearchOpen(false), []);
  const [avatarUrl, setAvatarUrl] = React.useState<string | null>(null);
  React.useEffect(() => {
    if (!authUser) { setAvatarUrl(null); return; }
    let cancelled = false;
    setAvatarUrl(readCachedAvatar() || getDefaultAvatar(authUser.email || authUser.id));
    void supabase.from("profiles").select("avatar_url").eq("id", authUser.id).maybeSingle().then(async ({ data }) => {
      const path = (data as { avatar_url?: string | null } | null)?.avatar_url;
      if (cancelled || !path) return;
      const { data: signed } = await supabase.storage.from("avatars").createSignedUrl(path, AVATAR_TTL_SECONDS);
      if (!cancelled && signed?.signedUrl) { setAvatarUrl(signed.signedUrl); writeCachedAvatar(signed.signedUrl); }
    });
    return () => { cancelled = true; };
  }, [authUser]);
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
        <div className="relative mx-auto flex h-[60px] max-w-[1280px] items-center gap-3 px-5 sm:px-6 lg:gap-8">
          <Link to="/" aria-label="Jenvu home" className="flex shrink-0 items-center">
            <JenvuMark className="h-7 w-7 shrink-0 text-foreground" />
          </Link>

          {searchOpen ? (
            <div className="hidden min-w-0 flex-1 md:flex lg:max-w-[520px]"><HeaderSearch onClose={closeSearch} /></div>
          ) : (
          <nav className="hidden min-w-0 items-center justify-start gap-0.5 whitespace-nowrap text-[14px] text-muted-foreground lg:flex [&>a]:rounded-full [&>a]:px-3 [&>a]:py-2 [&>a:hover]:bg-muted [&>a:hover]:text-foreground">
            <Link to="/about" activeProps={ACTIVE}>Why Jenvu</Link>
            <Link to="/ai-engine" activeProps={ACTIVE}>Products</Link>
            <Link to="/strategies/ict-gold-trading" activeProps={ACTIVE}>Solutions</Link>
            <Link to="/insights" activeProps={ACTIVE}>Resources</Link>
            <Link to="/platform" activeProps={ACTIVE}>Platform</Link>
            <Link to="/pricing" activeProps={ACTIVE}>Pricing</Link>
          </nav>
          )}

          <div className="ml-auto flex shrink-0 items-center gap-1.5">
            <button type="button" onClick={() => setSearchOpen(true)} aria-label="Search" tabIndex={searchOpen ? -1 : 0} aria-hidden={searchOpen} className={`hidden h-10 w-10 items-center justify-center rounded-full text-foreground hover:bg-muted md:inline-flex ${searchOpen ? "invisible" : ""}`}>
              <Search className="h-5 w-5" />
            </button>
            {isAuthed ? (
              <Link
                to="/dashboard/profile"
                aria-label="Account settings"
                title="Account settings"
                className="ml-1 inline-flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full ring-1 ring-border hover:ring-2 hover:ring-foreground/30"
              >
                {avatarUrl && <img src={avatarUrl} alt="" className="h-full w-full object-cover" />}
              </Link>
            ) : (
              <Link to="/auth" className="hidden whitespace-nowrap rounded-md px-2.5 py-2 text-[14px] text-muted-foreground hover:bg-muted hover:text-foreground xl:inline-flex">
                Log in
              </Link>
            )}
            <div className="relative hidden sm:block" onMouseLeave={() => setTryOpen(false)}>
              <button
                type="button"
                aria-expanded={tryOpen}
                aria-haspopup="menu"
                onClick={() => setTryOpen((v) => !v)}
                onMouseEnter={() => setTryOpen(true)}
                className="inline-flex h-10 items-center gap-1 rounded-full border border-foreground/20 bg-background px-4 text-[14px] font-medium text-foreground hover:bg-muted"
              >
                Try Jenvu <ChevronDown className={`h-4 w-4 transition-transform ${tryOpen ? "rotate-180" : ""}`} />
              </button>
              {tryOpen && (
                <div role="menu" className="absolute right-0 top-full z-50 pt-2">
                  <div className="w-56 rounded-2xl border border-border bg-background p-2 text-[14px] shadow-lg">
                    {[
                      { to: isAuthed ? "/dashboard" : "/auth", label: "Dashboard" },
                      { to: "/dashboard/terminal", label: "Fiber Terminal" },
                      { to: "/models", label: "AI models" },
                      { to: "/platform", label: "API Platform" },
                      { to: "/download", label: "Download app" },
                    ].map((it) => (
                      <Link key={it.label} to={it.to} role="menuitem" onClick={() => setTryOpen(false)} className="flex items-center justify-between rounded-lg px-3 py-2.5 text-foreground hover:bg-muted">
                        {it.label} <span className="text-[11px] text-muted-foreground">↗</span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => openAskJenvu("sales")}
              className="inline-flex h-10 items-center justify-center whitespace-nowrap rounded-full bg-foreground px-4 text-[14px] font-medium text-background hover:opacity-85"
            >
              Contact sales
            </button>
            <button
              type="button"
              aria-label="Open menu"
              aria-expanded={mobileMenuOpen}
              onClick={() => setMobileMenuOpen(true)}
              className="ml-1 inline-flex h-10 w-10 items-center justify-center rounded-full text-foreground hover:bg-muted lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      {mobileMenuOpen && (
        <div className="fixed inset-0 z-[60] lg:hidden" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-foreground/40" onClick={() => setMobileMenuOpen(false)} />
          <div className="absolute inset-x-0 top-0 bg-background border-b border-border shadow-lg">
            <div className="flex items-center justify-between px-5 py-3">
              <Link to="/" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-2.5">
                <JenvuMark className="h-6 w-6 text-foreground" />
                <span className="text-[20px] tracking-tight text-foreground" style={{ fontFamily: "\"Google Sans Flex\", \"Google Sans\",\"Product Sans\",\"DM Sans\",system-ui,sans-serif", fontWeight: 500 }}>Jenvu</span>
              </Link>
              <button
                type="button"
                aria-label="Close menu"
                onClick={() => setMobileMenuOpen(false)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-background text-foreground hover:bg-muted"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <nav className="flex flex-col px-3 pb-4 pt-1 text-[15px] text-foreground">
              {[
                { to: "/about", label: "Why Jenvu" },
                { to: "/ai-engine", label: "Products" },
                { to: "/strategies/ict-gold-trading", label: "Solutions" },
                { to: "/insights", label: "Resources" },
                { to: "/platform", label: "Platform" },
                { to: "/pricing", label: "Pricing" },
                { to: "/docs", label: "Docs" },
                { to: "/contact", label: "Contact us" },
              ].map((it) => (

                <Link
                  key={it.to}
                  to={it.to}
                  onClick={() => setMobileMenuOpen(false)}
                  className="rounded-lg px-3 py-3 hover:bg-muted"
                >
                  {it.label}
                </Link>
              ))}
              {isAuthed ? (
                <Link
                  to="/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className="mx-3 mt-3 inline-flex items-center justify-center rounded-lg border border-border bg-background px-3 py-2.5 text-sm font-medium text-foreground hover:bg-muted"
                >
                  Dashboard
                  <span className={`${MONO} text-[10px] opacity-70 ml-1.5`}>↗</span>
                </Link>
              ) : (
                <div className="mt-2 grid grid-cols-2 gap-2 px-3">
                  <Link
                    to="/auth"
                    onClick={() => setMobileMenuOpen(false)}
                    className="inline-flex items-center justify-center rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground hover:bg-muted"
                  >
                    Sign In
                  </Link>
                  <Link
                    to="/pricing"
                    onClick={() => setMobileMenuOpen(false)}
                    className="inline-flex items-center justify-center rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium text-foreground hover:bg-muted"
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
