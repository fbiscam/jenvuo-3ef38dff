import { Link } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";
import { useCredits } from "@/hooks/useCredits";

const MONO = "font-['JetBrains_Mono',ui-monospace,monospace]";

export default function TrialBanner({ className = "" }: { className?: string }) {
  const { state } = useCredits();
  const trial = state?.trial;
  if (!trial?.active) return null;

  const urgent = trial.daysLeft <= 3;
  const endsAt = trial.endsAt ? new Date(trial.endsAt) : null;

  return (
    <div
      className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3 ${
        urgent ? "border-amber-200 bg-amber-50" : "border-zinc-200 bg-white"
      } ${className}`}
    >
      <div className="flex items-center gap-2.5">
        <span
          className={`inline-flex h-7 w-7 items-center justify-center rounded-full ${
            urgent ? "bg-amber-100 text-amber-700" : "bg-zinc-100 text-zinc-900"
          }`}
        >
          <Sparkles className="h-3.5 w-3.5" />
        </span>
        <div className="leading-tight">
          <div className={`text-sm font-semibold ${urgent ? "text-amber-900" : "text-zinc-900"}`}>
            Pro Trial — {trial.daysLeft} {trial.daysLeft === 1 ? "day" : "days"} left
          </div>
          <div className={`${MONO} text-[11px] ${urgent ? "text-amber-700" : "text-zinc-500"}`}>
            All Pro features unlocked
            {endsAt ? ` · ends ${endsAt.toLocaleDateString()}` : ""}
          </div>
        </div>
      </div>
      <Link
        to="/dashboard/billing"
        className="inline-flex items-center rounded-lg bg-zinc-900 px-3.5 py-1.5 text-xs font-medium text-white hover:bg-zinc-800"
      >
        Upgrade to Pro
      </Link>
    </div>
  );
}
