import { createContext, useContext, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Flat look: no card border, section title above a full-width list split by
 * thin lines (label left in grey, value/control right). Wrap a page in
 * <SettingsFlat> to switch every SettingsCard/SettingsRow inside it.
 */
const FlatContext = createContext(false);

export function SettingsFlat({ children }: { children: ReactNode }) {
  return <FlatContext.Provider value={true}>{children}</FlatContext.Provider>;
}

/** One Settings section: title + short description, then rows split by thin lines. */
export function SettingsCard({
  id,
  title,
  description,
  children,
  action,
  tone = "default",
}: {
  id: string;
  title: string;
  description?: string;
  children: ReactNode;
  action?: ReactNode;
  tone?: "default" | "danger";
}) {
  const flat = useContext(FlatContext);
  if (flat) {
    return (
      <section id={id} className="scroll-mt-24">
        <div className="flex min-h-[52px] items-center justify-between gap-4 px-1 pb-3 sm:px-2">
          <div className="min-w-0">
            <p role="heading" aria-level={2} className="text-[17px] font-medium leading-tight text-gc-ink">{title}</p>
            {description && <p className="mt-1 max-w-[620px] text-[13px] leading-[1.55] text-gc-ink-muted">{description}</p>}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
        <div className="divide-y divide-gc-line border-t border-gc-line">{children}</div>
      </section>
    );
  }
  return (
    <section id={id} className="scroll-mt-24 rounded-md border border-gc-line bg-background">
      <div className="flex items-start justify-between gap-4 px-6 pt-6 sm:px-7">
        <div className="min-w-0">
          <p role="heading" aria-level={2} className={cn("text-[20px] font-medium leading-tight", tone === "danger" ? "text-destructive" : "text-gc-ink")}>{title}</p>
          {description && <p className="mt-1.5 max-w-[620px] text-[14px] leading-[1.55] text-gc-ink-muted">{description}</p>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      <div className="mt-4 divide-y divide-gc-line">{children}</div>
    </section>
  );
}

/** Row: label and help text on the left, control on the right (stacks on phones). */
export function SettingsRow({ label, hint, children, wide = false }: { label: ReactNode; hint?: ReactNode; children?: ReactNode; wide?: boolean }) {
  const flat = useContext(FlatContext);
  if (flat) {
    return (
      <div className={cn("flex min-h-[64px] px-1 py-4 sm:px-2", wide ? "flex-col gap-2" : "flex-wrap items-center justify-between gap-x-6 gap-y-2")}>
        <div className="min-w-0 flex-1 basis-[160px]">
          <div className="text-[14px] text-gc-ink-muted">{label}</div>
          {hint && <div className="mt-1 max-w-[560px] text-[13px] leading-[1.55] text-gc-ink-muted/80">{hint}</div>}
        </div>
        {children && <div className={cn("min-w-0 max-w-full text-[14px] text-gc-ink", !wide && "ml-auto text-right")}>{children}</div>}
      </div>
    );
  }
  return (
    <div className={cn("flex flex-col gap-3 px-6 py-5 sm:px-7", !wide && "sm:flex-row sm:items-center sm:justify-between sm:gap-8")}>
      <div className="min-w-0">
        <div className="text-[15px] font-medium text-gc-ink">{label}</div>
        {hint && <div className="mt-1 max-w-[560px] text-[13px] leading-[1.55] text-gc-ink-muted">{hint}</div>}
      </div>
      {children && <div className={cn("min-w-0", !wide && "shrink-0")}>{children}</div>}
    </div>
  );
}

export const settingsBtn =
  "inline-flex h-10 items-center justify-center gap-2 rounded-full border border-gc-line px-5 text-[14px] font-medium text-gc-blue-deep hover:bg-gc-surface disabled:opacity-50";
export const settingsBtnPrimary =
  "inline-flex h-10 items-center justify-center gap-2 rounded-full bg-gc-blue px-5 text-[14px] font-medium text-gc-on-blue hover:bg-gc-blue-hover disabled:opacity-50";
export const settingsField =
  "block h-11 w-full rounded-md border border-gc-line bg-background px-4 text-[15px] text-gc-ink outline-none focus:border-gc-blue-deep focus:ring-2 focus:ring-gc-blue-soft";
