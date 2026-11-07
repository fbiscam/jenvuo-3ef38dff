import type { ReactNode } from "react";

/**
 * Shared look for every Ops Console page (hub tools, admin pages, payments,
 * inbox). Same theme as the dashboard console: page canvas, soft rounded
 * console cards (#F4F4F4 on white, #141414 on black), pill tabs and black
 * primary buttons. Restyle here once, never per admin page.
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
      className={`ops-console ${
        standalone
          ? "min-h-dvh w-full bg-background text-foreground"
          : "-mx-5 -mt-7 -mb-7 min-h-[calc(100dvh-4rem)] overflow-hidden bg-background text-foreground sm:-mx-8"
      }`}
    >
      <div className="mx-auto w-full max-w-[1280px] px-4 pb-10 pt-6 sm:px-6 sm:pt-8">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            {icon && (
              <span className="ops-chip grid h-10 w-10 shrink-0 place-items-center rounded-xl [&_svg]:h-[18px] [&_svg]:w-[18px]">
                {icon}
              </span>
            )}
            <div className="min-w-0">
              <h1 className="truncate text-[22px] font-medium tracking-tight text-foreground sm:text-[26px]">{title}</h1>
              {description && <p className="mt-0.5 text-[13.5px] text-muted-foreground">{description}</p>}
            </div>
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </header>
        {tabs && (
          <div className="ops-tabs mt-5 flex max-w-full items-center gap-1 overflow-x-auto rounded-full p-1 text-[13px] [scrollbar-width:none] sm:w-fit">
            {tabs}
          </div>
        )}
        <div className="ops-content mt-5 space-y-4">{children}</div>
      </div>
    </div>
  );
}

/** Small numeric pill (1, 2, 3 …) used on tabs and hub tiles for new items. */
export function OpsCount({ value, className = "" }: { value?: number; className?: string }) {
  if (!value) return null;
  return (
    <span
      aria-label={`${value} new`}
      className={`ops-count inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1.5 text-[11px] font-semibold tabular-nums leading-none ${className}`}
    >
      {value > 99 ? "99+" : value}
    </span>
  );
}

export function OpsTab({
  active,
  onClick,
  count,
  children,
}: {
  active: boolean;
  onClick: () => void;
  /** New-item count shown as a pill next to the label. */
  count?: number;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-1.5 transition ${
        active ? "ops-tab-active font-medium text-foreground" : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {children}
      <OpsCount value={count} />
    </button>
  );
}

export type OpsStat = { label: string; value: ReactNode; hint?: ReactNode; tone?: OpsTone };

/** Row of headline numbers, one console card each. */
export function OpsStats({ items }: { items: OpsStat[] }) {
  return (
    <section className="grid grid-cols-2 gap-3 sm:grid-cols-[repeat(auto-fit,minmax(170px,1fr))]">
      {items.map((s) => (
        <div key={s.label} className="ops-card min-w-0 rounded-2xl px-4 py-4 sm:px-5">
          <div className="text-[12.5px] text-muted-foreground">{s.label}</div>
          <div className={`mt-2 truncate text-[22px] font-medium tabular-nums ${s.tone ? TONE_TEXT[s.tone] : "text-foreground"}`}>
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
    <section className="ops-card overflow-hidden rounded-2xl">
      {(title || actions) && (
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 pt-4 sm:px-5">
          {title && <h2 className="text-[14px] font-medium text-foreground">{title}</h2>}
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className={flush ? "pt-3" : "px-4 py-4 sm:px-5"}>{children}</div>
    </section>
  );
}

export function OpsBody({ children }: { children: ReactNode }) {
  return <div className="space-y-4">{children}</div>;
}

export function OpsState({ title, description, standalone }: { title: string; description?: string; standalone?: boolean }) {
  return (
    <div
      className={`ops-console flex flex-col items-center justify-center bg-background px-6 text-center ${
        standalone ? "min-h-dvh" : "-mx-5 -mt-7 -mb-7 min-h-[calc(100dvh-4rem)] sm:-mx-8"
      }`}
    >
      <div className="ops-card rounded-2xl px-8 py-7">
        <p className="text-sm font-medium text-foreground">{title}</p>
        {description && <p className="mt-2 max-w-sm text-[13px] text-muted-foreground">{description}</p>}
      </div>
    </div>
  );
}

export type OpsTone = "success" | "warning" | "danger" | "info" | "neutral";

const TONE_TEXT: Record<OpsTone, string> = {
  success: "text-gc-success",
  warning: "text-gc-amber",
  danger: "text-gc-red",
  info: "text-foreground",
  neutral: "text-foreground",
};

const TONE_BADGE: Record<OpsTone, string> = {
  success: "bg-gc-green-soft text-gc-success",
  warning: "bg-gc-yellow-soft text-gc-amber",
  danger: "bg-gc-red-soft text-gc-red",
  info: "ops-chip text-foreground",
  neutral: "ops-chip text-muted-foreground",
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
  tableWrap: "ops-card overflow-x-auto rounded-2xl",
  table: "w-full text-[13px]",
  thead: "ops-line border-b text-left text-[12px] font-normal text-muted-foreground",
  th: "whitespace-nowrap px-4 py-3 font-normal first:pl-4 sm:first:pl-5 last:pr-4 sm:last:pr-5",
  tr: "ops-line border-b last:border-b-0 transition hover:bg-foreground/[0.03]",
  td: "whitespace-nowrap px-4 py-3 first:pl-4 sm:first:pl-5 last:pr-4 sm:last:pr-5",
  input:
    "ops-input h-10 w-full rounded-xl px-3 text-[13px] text-foreground outline-none transition placeholder:text-muted-foreground focus:ring-2 focus:ring-foreground/15",
  btn: "ops-btn inline-flex h-9 items-center justify-center gap-1.5 rounded-full px-4 text-[13px] font-medium text-foreground transition disabled:cursor-not-allowed disabled:opacity-50",
  btnPrimary:
    "inline-flex h-9 items-center justify-center gap-1.5 rounded-full bg-foreground px-4 text-[13px] font-medium text-background transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50",
  card: "ops-card rounded-2xl",
};
