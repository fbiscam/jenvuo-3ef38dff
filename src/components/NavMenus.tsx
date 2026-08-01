import { Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

export type NavItem = { to: string; label: string };

export const TOOLS_LINKS: NavItem[] = [
  { to: "/tools/leads", label: "Leads Generation" },
  { to: "/tools/scam-detector", label: "Scam Detector" },
  { to: "/tools/image-enhancer", label: "Image Enhancer" },
];

export const RESOURCES_LINKS: NavItem[] = [
  { to: "/ai-engine", label: "AI Engine" },
  { to: "/broadcasts", label: "Broadcasts" },
  { to: "/insights", label: "Market Insights" },
];

export function NavDropdown({ label, items }: { label: string; items: NavItem[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  return (
    <div ref={ref} className="relative" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1 text-zinc-900 hover:text-zinc-900"
      >
        {label}
        <ChevronDown className={`h-3.5 w-3.5 text-zinc-500 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute left-1/2 top-full z-50 w-56 -translate-x-1/2 pt-3">
          <div className="overflow-hidden rounded-2xl border border-zinc-200/70 bg-white p-1.5 shadow-[0_1px_2px_rgba(16,24,40,0.04),0_16px_36px_-16px_rgba(16,24,40,0.18)]">
            {items.map((it) => (
              <Link
                key={it.to}
                to={it.to}
                onClick={() => setOpen(false)}
                className="block rounded-xl px-3 py-2.5 text-[14px] text-zinc-800 hover:bg-zinc-50"
              >
                {it.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function MobileNavGroup({
  label,
  items,
  onNavigate,
}: {
  label: string;
  items: NavItem[];
  onNavigate?: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between rounded-lg px-3 py-3 text-left hover:bg-zinc-50"
      >
        {label}
        <ChevronDown className={`h-4 w-4 text-zinc-500 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="pl-3">
          {items.map((it) => (
            <Link
              key={it.to}
              to={it.to}
              onClick={onNavigate}
              className="block rounded-lg px-3 py-2.5 text-[14px] text-zinc-700 hover:bg-zinc-50"
            >
              {it.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
