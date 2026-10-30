import type { ReactNode } from "react";

/**
 * Shared look for every Ops Console page (hub tools, admin pages, payments,
 * inbox). Mirrors the Usage page: full-bleed white surface, a slim header row
 * with a bottom rule, hairline-separated sections and 13px labels.
 */

type OpsPageProps = {
  title: string;
  description?: ReactNode;
  icon?: ReactNode;
  actions?: ReactNode;
  /** Sub-navigation (tabs) rendered under the header. */
  tabs?: ReactNode;
  /** Use outside the dashboard layout (own route, no page padding to cancel). */
  standalone?: boolean;
  children: ReactNode;
};

export function OpsPage({ title, description, icon, actions, tabs, standalone, children }: OpsPageProps) {
  return (
    <div
      className={
        standalone
          ? "min-h-dvh w-full bg-background text-foreground"
          : "-mx-5 -mb-7 min-h-[calc(100dvh-4rem)] overflow-hidden bg-background text-foreground sm:-mx-8"
      }
    >
      <header className="flex min-h-14 flex-col gap-3 border-b border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          {icon && (
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-gc-sky text-gc-blue-deep [&_svg]:h-4 [&_svg]:w-4">
              {icon}
            </span>
          )}
          <div className="min-w-0">
            <h1 className="truncate text-[15px] font-medium text-foreground">{title}</h1>
            {description && <p className="mt-0.5 text-[13px] text-muted-foreground">{description}</p>}
          </div>
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </header>
      {tabs && (
        <div className="flex max-w-full items-center gap-7 overflow-x-auto border-b border-border px-4 text-[13px] sm:px-6">
          {tabs}
        </div>
      )}
      {children}
    </div>
  );
}

export function OpsTab({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative shrink-0 py-3 transition ${
        active ? "font-medium text-foreground" : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {children}
      {active && <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-foreground" />}
    </button>
  );
}

export type OpsStat = { label: string; value: ReactNode; hint?: ReactNode; tone?: OpsTone };

/** Row of headline numbers split by hairlines, like Usage "Total Spend". */
export function OpsStats({ items }: { items: OpsStat[] }) {
  return (
    <section className="grid grid-cols-2 border-b border-border sm:grid-cols-[repeat(auto-fit,minmax(160px,1fr))]">
      {items.map((s, i) => (
        <div
          key={s.label}
          className={`min-w-0 border-border px-4 py-5 sm:px-6 ${i % 2 === 1 ? "border-l" : ""} ${
            i >= 2 ? "border-t sm:border-t-0" : ""
          } sm:border-l sm:first:border-l-0`}
        >
          <div className="text-[13px] text-muted-foreground">{s.label}</div>
          <div className={`mt-2 truncate text-xl font-medium tabular-nums ${s.tone ? TONE_TEXT[s.tone] : "text-foreground"}`}>
            {s.value}
          </div>
          {s.hint && <div className="mt-1 truncate text-[12px] text-muted-foreground">{s.hint}</div>}
        </div>
      ))}
    </section>
  );
}

export function OpsSection({
  title,
  actions,
  children,
  flush,
}: {
  title?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  /** Remove inner padding (for edge-to-edge tables). */
  flush?: boolean;
}) {
  return (
    <section className="border-b border-border">
      {(title || actions) && (
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 pt-5 sm:px-6">
          {title && <h2 className="text-[13px] font-medium text-foreground">{title}</h2>}
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className={flush ? "pt-3" : "px-4 py-4 sm:px-6"}>{children}</div>
    </section>
  );
}

export function OpsBody({ children }: { children: ReactNode }) {
  return <div className="space-y-4 px-4 py-5 sm:px-6">{children}</div>;
}

export function OpsState({ title, description, standalone }: { title: string; description?: string; standalone?: boolean }) {
  return (
    <div
      className={`flex flex-col items-center justify-center bg-background px-6 text-center ${
        standalone ? "min-h-dvh" : "-mx-5 -mb-7 min-h-[calc(100dvh-4rem)] sm:-mx-8"
      }`}
    >
      <p className="text-sm font-medium text-foreground">{title}</p>
      {description && <p className="mt-2 max-w-sm text-[13px] text-muted-foreground">{description}</p>}
    </div>
  );
}

export type OpsTone = "success" | "warning" | "danger" | "info" | "neutral";

const TONE_TEXT: Record<OpsTone, string> = {
  success: "text-gc-success",
  warning: "text-gc-amber",
  danger: "text-gc-red",
  info: "text-gc-blue-deep",
  neutral: "text-foreground",
};

const TONE_BADGE: Record<OpsTone, string> = {
  success: "bg-gc-green-soft text-gc-success",
  warning: "bg-gc-yellow-soft text-gc-amber",
  danger: "bg-gc-red-soft text-gc-red",
  info: "bg-gc-sky text-gc-blue-deep",
  neutral: "bg-muted text-muted-foreground",
};

export function OpsBadge({ tone = "neutral", children }: { tone?: OpsTone; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${TONE_BADGE[tone]}`}>
      {children}
    </span>
  );
}

/** Shared class strings so plain tables/inputs match the console look. */
export const ops = {
  tableWrap: "overflow-x-auto",
  table: "w-full text-[13px]",
  thead: "border-y border-border text-left text-[12px] font-normal text-muted-foreground",
  th: "whitespace-nowrap px-4 py-2.5 font-normal first:pl-4 sm:first:pl-6 last:pr-4 sm:last:pr-6",
  tr: "border-b border-border transition hover:bg-muted/40",
  td: "whitespace-nowrap px-4 py-3 first:pl-4 sm:first:pl-6 last:pr-4 sm:last:pr-6",
  input:
    "h-9 w-full rounded-lg border border-border bg-background px-3 text-[13px] text-foreground outline-none transition placeholder:text-muted-foreground focus:border-gc-blue focus:ring-2 focus:ring-gc-blue-soft",
  btn: "inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-border bg-background px-3 text-[13px] font-medium text-foreground transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50",
  btnPrimary:
    "inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-gc-blue px-3 text-[13px] font-medium text-gc-on-blue transition hover:bg-gc-blue-hover disabled:cursor-not-allowed disabled:opacity-50",
  card: "rounded-xl border border-border bg-background",
};
