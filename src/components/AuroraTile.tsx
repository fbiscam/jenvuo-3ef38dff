import type { LucideIcon } from "lucide-react";

const AURORAS = ["var(--platform-aurora-1)", "var(--platform-aurora-2)", "var(--platform-aurora-3)"];

/** Platform-style aurora gradient tile with white icon chips (replaces photos). */
export function AuroraTile({
  n = 0,
  icons,
  className = "",
  small = false,
}: {
  n?: number;
  icons: LucideIcon[];
  className?: string;
  small?: boolean;
}) {
  const cols = icons.length >= 3 ? "grid-cols-3" : icons.length === 2 ? "grid-cols-2" : "";
  const chip = small ? "h-10 w-10 rounded-xl" : "h-14 w-14 rounded-2xl sm:h-16 sm:w-16";
  const ic = small ? "h-5 w-5" : "h-6 w-6 sm:h-7 sm:w-7";
  return (
    <div
      aria-hidden
      className={`flex items-center justify-center overflow-hidden rounded-md ${className}`}
      style={{ backgroundImage: AURORAS[n % AURORAS.length] }}
    >
      <div className={`grid gap-3 ${cols}`}>
        {icons.map((Icon, k) => (
          <span key={k} className={`flex items-center justify-center bg-background/90 text-gc-ink shadow-sm ${chip}`}>
            <Icon className={ic} />
          </span>
        ))}
      </div>
    </div>
  );
}
