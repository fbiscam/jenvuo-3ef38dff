import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** One Settings section: title + short description, then rows split by thin lines. */
export function SettingsCard({
  id,
  title,
  description,
  children,
  tone = "default",
}: {
  id: string;
  title: string;
  description?: string;
  children: ReactNode;
  tone?: "default" | "danger";
}) {
  return (
    <section id={id} className="scroll-mt-24 rounded-[24px] border border-gc-line bg-background">
      <div className="px-6 pt-6 sm:px-7">
        <p role="heading" aria-level={2} className={cn("text-[20px] font-medium leading-tight", tone === "danger" ? "text-destructive" : "text-gc-ink")}>{title}</p>
        {description && <p className="mt-1.5 max-w-[620px] text-[14px] leading-[1.55] text-gc-ink-muted">{description}</p>}
      </div>
      <div className="mt-4 divide-y divide-gc-line">{children}</div>
    </section>
  );
}

/** Row: label and help text on the left, control on the right (stacks on phones). */
export function SettingsRow({ label, hint, children, wide = false }: { label: string; hint?: ReactNode; children?: ReactNode; wide?: boolean }) {
  return (
    <div className={cn("flex flex-col gap-3 px-6 py-5 sm:px-7", !wide && "sm:flex-row sm:items-center sm:justify-between sm:gap-8")}>
      <div className="min-w-0">
        <p className="text-[15px] font-medium text-gc-ink">{label}</p>
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
  "block h-11 w-full rounded-xl border border-gc-line bg-background px-4 text-[15px] text-gc-ink outline-none focus:border-gc-blue-deep focus:ring-2 focus:ring-gc-blue-soft";
