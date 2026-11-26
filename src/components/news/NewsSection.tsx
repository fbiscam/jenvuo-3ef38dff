import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

export function NewsSection({ icon: Icon, title, sub, id, action, children }: {
  icon: LucideIcon;
  title: string;
  sub: string;
  id: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="mt-10" aria-labelledby={id}>
      <div className="mb-4 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <h2 id={id} className="flex items-center gap-2 text-[18px] font-medium sm:text-[20px]">
            <Icon className="h-[18px] w-[18px] shrink-0" aria-hidden="true" /> {title}
          </h2>
          <p className="mt-0.5 text-[14px] text-muted-foreground">{sub}</p>
        </div>
        {action}
      </div>
      <div className="console-card overflow-hidden">{children}</div>
    </section>
  );
}