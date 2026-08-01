import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import HeaderAuthButtons from "@/components/HeaderAuthButtons";
import { NavDropdown, MobileNavGroup, TOOLS_LINKS, RESOURCES_LINKS } from "@/components/NavMenus";

export default function SiteHeader() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <header className="hide-in-pwa sticky top-0 z-50 border-b border-zinc-100 bg-white/85 backdrop-blur-md">
        <div className="relative mx-auto flex max-w-6xl items-center justify-between gap-3 px-5 py-3 sm:px-6 sm:py-4">
          <Link to="/" className="flex min-w-0 items-center gap-2.5">
            <img src="/favicon.png" alt="Jenvu Logo" className="h-7 w-7 shrink-0 rounded-md object-contain" />
            <span
              className="truncate text-[22px] leading-none tracking-tight"
              style={{
                color: "#3c4043",
                fontFamily: '"Google Sans", "Product Sans", "DM Sans", system-ui, sans-serif',
                fontWeight: 500,
              }}
            >
              Jenvu
            </span>
          </Link>

          <nav className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-7 text-sm text-zinc-900 md:flex">
            <Link to="/signal" className="hover:text-zinc-900">Signal Engine</Link>
            <Link to="/signals-live" className="hover:text-zinc-900">Signals Live</Link>
            <NavDropdown label="Tools" items={TOOLS_LINKS} />
            <NavDropdown label="Resources" items={RESOURCES_LINKS} />
            <Link to="/founding" className="hover:text-zinc-900">Founding</Link>
            <Link to="/contact" className="hover:text-zinc-900">Contact</Link>
          </nav>

          <div className="flex items-center gap-2">
            <div className="hidden md:block">
              <HeaderAuthButtons />
            </div>
            <button
              type="button"
              aria-label="Open menu"
              aria-expanded={open}
              onClick={() => setOpen(true)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-900 hover:bg-zinc-50 md:hidden"
            >
              <Menu className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      {open && (
        <div className="fixed inset-0 z-[60] md:hidden" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-zinc-900/40" onClick={() => setOpen(false)} />
          <div className="absolute inset-x-0 top-0 border-b border-zinc-100 bg-white shadow-lg">
            <div className="flex items-center justify-between px-5 py-3">
              <span className="text-[18px] text-zinc-900">Menu</span>
              <button
                type="button"
                aria-label="Close menu"
                onClick={() => setOpen(false)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-200 bg-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <nav className="flex flex-col px-3 pb-4 text-[15px] text-zinc-900">
              <Link to="/signal" onClick={() => setOpen(false)} className="rounded-lg px-3 py-3 hover:bg-zinc-50">Signal Engine</Link>
              <Link to="/signals-live" onClick={() => setOpen(false)} className="rounded-lg px-3 py-3 hover:bg-zinc-50">Signals Live</Link>
              <MobileNavGroup label="Tools" items={TOOLS_LINKS} onNavigate={() => setOpen(false)} />
              <MobileNavGroup label="Resources" items={RESOURCES_LINKS} onNavigate={() => setOpen(false)} />
              <Link to="/founding" onClick={() => setOpen(false)} className="rounded-lg px-3 py-3 hover:bg-zinc-50">Founding</Link>
              <Link to="/contact" onClick={() => setOpen(false)} className="rounded-lg px-3 py-3 hover:bg-zinc-50">Contact</Link>
            </nav>
          </div>
        </div>
      )}
    </>
  );
}
