import { Link } from "@tanstack/react-router";
import { useAuthUser } from "@/hooks/useAuthUser";

const MONO = "font-['JetBrains_Mono',ui-monospace,monospace]";

export default function HeaderAuthButtons() {
  const { user, loading } = useAuthUser();

  // Reserve space to avoid layout jump
  if (loading) {
    return <div className="flex shrink-0 items-center gap-2" style={{ minWidth: 180, minHeight: 32 }} />;
  }

  if (user) {
    return (
      <div className="flex shrink-0 items-center gap-2">
        <Link
          to="/dashboard"
          className={`hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-200 bg-white text-zinc-900 hover:bg-zinc-50 transition ${MONO} text-[10px] tracking-wider uppercase`}
        >
          Dashboard
        </Link>
        <Link
          to="/app"
          className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-800 sm:gap-2 sm:px-3.5 sm:text-sm"
        >
          Launch
          <span className={`${MONO} text-[10px] opacity-70`}>↗</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="flex shrink-0 items-center gap-2">
      <Link
        to="/auth"
        className="hidden sm:inline-flex px-3 py-1.5 text-sm text-zinc-900 hover:text-zinc-700"
      >
        Sign In
      </Link>
      <Link
        to="/auth"
        search={{ redirect: "/app" } as never}
        className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-800 sm:gap-2 sm:px-3.5 sm:text-sm"
      >
        Try Jenvu
        <span className={`${MONO} text-[10px] opacity-70`}>→</span>
      </Link>
    </div>
  );
}
