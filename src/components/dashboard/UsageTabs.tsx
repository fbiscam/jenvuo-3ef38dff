import { Link } from "@tanstack/react-router";

export function UsageTabs({ active }: { active: "usage" | "bot" }) {
  const cls = (on: boolean) =>
    `rounded-full px-3 py-1.5 text-[14px] font-medium transition-colors ${on ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground"}`;
  return (
    <nav className="-ml-3 flex items-center gap-1" aria-label="Usage sections">
      <Link to="/dashboard/usage" className={cls(active === "usage")}>Usage</Link>
    </nav>
  );
}
