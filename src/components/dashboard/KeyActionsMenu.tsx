import { useEffect, useRef, useState, type ReactNode } from "react";
import { Ban, ChartNoAxesCombined, Copy, MoreHorizontal, Pencil, RefreshCw, Trash2 } from "lucide-react";

type Item = {
  key: string;
  label: string;
  icon: ReactNode;
  onSelect: () => void;
  danger?: boolean;
  hidden?: boolean;
};

/** ⋯ button on an API key row. The menu is fixed-positioned so the table's scroll box can't clip it. */
export function KeyActionsMenu({
  keyName,
  revoked,
  onCopyId,
  onViewUsage,
  onEdit,
  onDisable,
  onRotate,
  onDelete,
}: {
  keyName: string;
  revoked: boolean;
  onCopyId: () => void;
  onViewUsage: () => void;
  onEdit: () => void;
  onDisable: () => void;
  onRotate: () => void;
  onDelete: () => void;
}) {
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!pos) return;
    const close = () => setPos(null);
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (menu.current?.contains(t) || btn.current?.contains(t)) return;
      close();
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", close);
    window.addEventListener("scroll", close, true);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", close);
      window.removeEventListener("scroll", close, true);
    };
  }, [pos]);

  const toggle = () => {
    if (pos) return setPos(null);
    const r = btn.current?.getBoundingClientRect();
    if (!r) return;
    const menuH = 280;
    const top = r.bottom + 6 + menuH > window.innerHeight ? Math.max(8, r.top - menuH - 6) : r.bottom + 6;
    setPos({ top, right: Math.max(8, window.innerWidth - r.right) });
  };

  const items: Item[] = [
    { key: "copy", label: "Copy key ID", icon: <Copy className="h-4 w-4" />, onSelect: onCopyId },
    { key: "usage", label: "View usage", icon: <ChartNoAxesCombined className="h-4 w-4" />, onSelect: onViewUsage },
    { key: "edit", label: "Edit key", icon: <Pencil className="h-4 w-4" />, onSelect: onEdit },
    { key: "disable", label: "Disable key", icon: <Ban className="h-4 w-4" />, onSelect: onDisable, hidden: revoked },
    { key: "rotate", label: "Rotate key", icon: <RefreshCw className="h-4 w-4" />, onSelect: onRotate, hidden: revoked },
    { key: "delete", label: "Delete key", icon: <Trash2 className="h-4 w-4" />, onSelect: onDelete, danger: true },
  ];

  return (
    <>
      <button
        ref={btn}
        type="button"
        aria-label={`Actions for ${keyName}`}
        aria-haspopup="menu"
        aria-expanded={!!pos}
        onClick={toggle}
        className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-[var(--console-card)] hover:text-foreground"
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>
      {pos && (
        <div
          ref={menu}
          role="menu"
          style={{ position: "fixed", top: pos.top, right: pos.right }}
          className="z-[70] w-52 rounded-2xl border border-border bg-popover p-1.5 text-popover-foreground shadow-xl"
        >
          {items
            .filter((i) => !i.hidden)
            .map((i) => (
              <div key={i.key}>
                {i.danger && <div className="my-1 h-px bg-border" />}
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setPos(null);
                    i.onSelect();
                  }}
                  className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-[14px] transition-colors hover:bg-[var(--console-card)] ${
                    i.danger ? "text-red-600 dark:text-red-400" : "text-foreground"
                  }`}
                >
                  <span className={i.danger ? "" : "text-muted-foreground"}>{i.icon}</span>
                  {i.label}
                </button>
              </div>
            ))}
        </div>
      )}
    </>
  );
}
