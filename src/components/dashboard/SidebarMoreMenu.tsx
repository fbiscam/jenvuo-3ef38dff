import { Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Activity, BookOpen, FileText, LifeBuoy, LogOut, Mail, MoreHorizontal, Settings } from "lucide-react";

type ApiState = "checking" | "active" | "down";

const CHECK_EVERY_MS = 60_000;

/** Pings the public API every minute; "active" only when it answers with its model list. */
function useApiStatus(): ApiState {
  const [state, setState] = useState<ApiState>("checking");
  useEffect(() => {
    let alive = true;
    const check = async () => {
      try {
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), 10_000);
        const res = await fetch("/api/public/v1/models", { cache: "no-store", signal: ctrl.signal });
        clearTimeout(t);
        const body = res.ok ? ((await res.json()) as { data?: unknown[] }) : null;
        if (alive) setState(body && Array.isArray(body.data) && body.data.length > 0 ? "active" : "down");
      } catch {
        if (alive) setState("down");
      }
    };
    void check();
    const id = setInterval(check, CHECK_EVERY_MS);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);
  return state;
}

export function SidebarMoreMenu({ onSignOut }: { onSignOut: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const status = useApiStatus();

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const item =
    "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-[14px] text-foreground transition-colors hover:bg-foreground/[0.06]";
  const close = () => setOpen(false);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title="More"
        aria-label="More options"
        aria-expanded={open}
        aria-haspopup="menu"
        className="sidebar-quick-btn inline-flex h-8 w-8 items-center justify-center rounded-md text-gc-ink"
      >
        <MoreHorizontal className="h-4 w-4" strokeWidth={2} />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute bottom-full left-0 z-50 mb-2 w-[244px] rounded-2xl border border-border bg-background p-1.5 text-foreground shadow-[0_12px_32px_-12px_rgba(0,0,0,0.25)]"
        >
          <div className="flex items-center gap-3 px-3 py-2 text-[14px]" role="status" aria-live="polite">
            <Activity className="h-4 w-4" strokeWidth={2} />
            <span className="flex-1">API status</span>
            <span className="inline-flex items-center gap-1.5 text-[13px] text-muted-foreground">
              <span
                className={`h-2 w-2 rounded-full ${
                  status === "active" ? "bg-emerald-500" : status === "down" ? "bg-red-500" : "bg-muted-foreground/50"
                }`}
              />
              {status === "active" ? "Active" : status === "down" ? "Down" : "Checking"}
            </span>
          </div>
          <Link to="/dashboard/profile" role="menuitem" onClick={close} className={item}>
            <Settings className="h-4 w-4" strokeWidth={2} /> Settings
          </Link>
          <Link to="/docs" role="menuitem" onClick={close} className={item}>
            <BookOpen className="h-4 w-4" strokeWidth={2} /> Documentation
          </Link>
          <Link to="/help" role="menuitem" onClick={close} className={item}>
            <LifeBuoy className="h-4 w-4" strokeWidth={2} /> Support
          </Link>
          <Link to="/contact" role="menuitem" onClick={close} className={item}>
            <Mail className="h-4 w-4" strokeWidth={2} /> Contact
          </Link>
          <Link to="/terms" role="menuitem" onClick={close} className={item}>
            <FileText className="h-4 w-4" strokeWidth={2} /> Terms and policies
          </Link>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              close();
              onSignOut();
            }}
            className={item}
          >
            <LogOut className="h-4 w-4" strokeWidth={2} /> Log out
          </button>
        </div>
      )}
    </div>
  );
}
