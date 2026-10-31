import { Check, ChevronsUpDown } from "lucide-react";
import type { ReactNode } from "react";

/** Console filter trigger: muted label + bold value + up/down arrows; menu opens below, left aligned. */
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
}) {
  return (
    <div className="relative min-w-0">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={ariaLabel}
        className="flex h-9 min-w-0 items-center gap-1.5 rounded-lg border border-border bg-transparent px-3 text-[13px] transition-colors hover:bg-foreground/[0.05]"
      >
        {icon}
        {label && <span className="shrink-0 text-muted-foreground">{label}</span>}
        <span className="truncate font-medium text-foreground">{valueLabel}</span>
        <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      </button>
      {open && (
        <div
          role="listbox"
          className="absolute left-0 top-full z-30 mt-1 max-h-72 min-w-full w-max max-w-[min(18rem,calc(100vw-2rem))] overflow-y-auto rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-lg"
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
                className={`flex w-full items-center justify-between gap-4 rounded-md px-2.5 py-1.5 text-left text-[13px] transition-colors hover:bg-foreground/[0.06] ${
                  on ? "font-medium text-foreground" : "text-muted-foreground"
                }`}
              >
                <span className="truncate">{o.label}</span>
                {on && <Check className="h-3.5 w-3.5 shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
