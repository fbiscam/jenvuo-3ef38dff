import { Check, ChevronsUpDown } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";

/**
 * Console filter: muted label + value + up/down arrows (plain text, no box when `plain`).
 * The menu opens right below the trigger with a check on the selected item.
 */
export function ConsoleSelect({
  open,
  onToggle,
  label,
  valueLabel,
  icon,
  options,
  value,
  onSelect,
  ariaLabel,
  plain = false,
  align = "left",
  hideArrows = false,
  emptyText,
}: {
  open: boolean;
  onToggle: () => void;
  label?: string;
  valueLabel: string;
  icon?: ReactNode;
  options: { value: string; label: string }[];
  value: string;
  onSelect: (v: string) => void;
  ariaLabel?: string;
  plain?: boolean;
  align?: "left" | "right";
  hideArrows?: boolean;
  emptyText?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  // Close when clicking outside or pressing Escape.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onToggle();
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onToggle();
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onToggle]);

  return (
    <div ref={ref} className="relative min-w-0">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={ariaLabel}
        className={
          plain
            ? "console-select-plain flex h-8 min-w-0 items-center gap-1.5 rounded-md bg-transparent px-0 text-[14px] transition-opacity hover:opacity-80"
            : "flex h-9 min-w-0 items-center gap-1.5 rounded-lg border border-border bg-transparent px-3 text-[13px] transition-colors hover:bg-foreground/[0.05]"
        }
      >
        {icon}
        {label && <span className="shrink-0 text-muted-foreground">{label}</span>}
        <span className={`truncate text-foreground ${plain ? "" : "font-medium"}`}>{valueLabel}</span>
        {!hideArrows && <ChevronsUpDown className="ml-1 h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
      </button>
      {open && (
        <div
          role="listbox"
          className={`absolute top-full z-30 mt-2 max-h-72 w-max min-w-[8.5rem] max-w-[min(18rem,calc(100vw-2rem))] overflow-y-auto rounded-xl border border-border bg-popover p-1 text-popover-foreground shadow-[0_8px_24px_-8px_rgba(0,0,0,0.18)] ${
            align === "right" ? "right-0" : plain ? "-left-2" : "left-0"
          }`}
        >
          {options.map((o) => {
            const on = o.value === value;
            return (
              <button
                key={o.value}
                type="button"
                role="option"
                aria-selected={on}
                onClick={() => onSelect(o.value)}
                className={`flex w-full items-center justify-between gap-6 rounded-lg px-3 py-2 text-left text-[14px] text-foreground transition-colors hover:bg-foreground/[0.05] ${
                  on ? "bg-foreground/[0.06]" : ""
                }`}
              >
                <span className="truncate">{o.label}</span>
                {on && <Check className="h-4 w-4 shrink-0" />}
              </button>
            );
          })}
          {emptyText && (
            <div className="px-3 py-2 text-[14px] text-muted-foreground">{emptyText}</div>
          )}
        </div>
      )}
    </div>
  );
}
