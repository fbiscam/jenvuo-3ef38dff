import * as React from "react";

/**
 * Shared building blocks for the centered xAI/SpaceX-style public forms
 * (Contact and Founding). Restyle here once, not per page.
 */

export const FORM_SANS = "font-['Google_Sans_Flex','Google_Sans','Product_Sans','Poppins',system-ui,sans-serif]";

export function FormHero({ eyebrow, title, children }: { eyebrow: string; title: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-[640px] text-center">
      <p className="text-[13px] text-gc-ink-muted">{eyebrow}</p>
      <h1 className="mt-4 text-[2.6rem] font-normal leading-[1.05] tracking-tight sm:text-[3.6rem]">{title}</h1>
      <div className="mx-auto mt-6 max-w-[540px] text-[17px] leading-relaxed text-foreground">{children}</div>
    </div>
  );
}

export function FormCallout({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="mx-auto mt-10 max-w-[404px] rounded-xl bg-gc-surface px-6 py-6 text-center">
      <div className="text-[14px] leading-relaxed text-foreground">{children}</div>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export const CALLOUT_BUTTON =
  "inline-flex items-center gap-1.5 rounded-full border border-gc-line bg-background px-3.5 py-1.5 text-[14px] text-foreground transition-colors hover:bg-gc-pill";

export function ArrowUpRight() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
      <path d="M7 17 17 7M8 7h9v9" />
    </svg>
  );
}

export function FormField({
  label,
  htmlFor,
  required,
  error,
  children,
}: {
  label: string;
  htmlFor?: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="block text-[15px] text-foreground">
        {label}
        {required && <span> *</span>}
      </label>
      <div className="mt-2">{children}</div>
      {error && <p className="mt-1.5 text-xs text-destructive">{error}</p>}
    </div>
  );
}

export function formInputClass(hasError = false) {
  return [
    "w-full rounded-lg border bg-background px-3.5 py-2.5 text-[15px] text-foreground placeholder:text-gc-ink-muted",
    "outline-none transition focus:border-foreground/40 focus:ring-1 focus:ring-foreground/20",
    hasError ? "border-destructive" : "border-gc-line",
  ].join(" ");
}

export function RadioCards<T extends string>({
  name,
  value,
  onChange,
  options,
}: {
  name: string;
  value: T | "";
  onChange: (v: T) => void;
  options: readonly { id: T; label: string; hint?: string }[];
}) {
  return (
    <div role="radiogroup" className="space-y-1.5">
      {options.map((o) => {
        const active = value === o.id;
        return (
          <label
            key={o.id}
            className={`flex cursor-pointer items-center gap-3 rounded-lg bg-gc-surface px-3.5 py-2.5 text-[14px] text-foreground transition-colors hover:bg-gc-pill ${active ? "bg-gc-pill" : ""}`}
          >
            <input
              type="radio"
              name={name}
              value={o.id}
              checked={active}
              onChange={() => onChange(o.id)}
              className="sr-only"
            />
            <span
              aria-hidden
              className={`grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full border bg-background ${active ? "border-foreground" : "border-gc-line"}`}
            >
              {active && <span className="h-2 w-2 rounded-full bg-foreground" />}
            </span>
            <span>{o.label}</span>
            {o.hint && <span className="ml-auto text-[13px] text-gc-ink-muted">{o.hint}</span>}
          </label>
        );
      })}
    </div>
  );
}

export const SUBMIT_BUTTON =
  "inline-flex items-center rounded-full bg-foreground px-4 py-2.5 text-[14px] font-medium text-background transition-opacity hover:opacity-85 disabled:opacity-60";
