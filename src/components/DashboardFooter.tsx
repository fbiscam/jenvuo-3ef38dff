import { Link } from "@tanstack/react-router";

const LINKS: { label: string; to: string }[] = [
  { label: "About Us", to: "/about" },
  { label: "Contact Us", to: "/contact" },
  { label: "Privacy Policy", to: "/privacy" },
  { label: "Terms Conditions", to: "/terms" },
  { label: "Help Center", to: "/help" },
];

export default function DashboardFooter(_props: { sidebarCollapsed?: boolean } = {}) {
  const year = new Date().getFullYear();
  return (
    <footer className="sticky bottom-0 z-10 mt-8 h-11 shrink-0 border-t border-zinc-200 bg-white/85 backdrop-blur-sm">
      <div className="mx-auto flex h-full max-w-7xl flex-wrap items-center justify-center gap-x-5 gap-y-1 px-4 text-center text-[12px] text-zinc-600 sm:px-6">
        {LINKS.map((l) => (
          <Link
            key={l.to}
            to={l.to}
            className="text-zinc-700 hover:text-zinc-900 hover:underline underline-offset-4"
          >
            {l.label}
          </Link>
        ))}
        <span className="text-zinc-500">© {year} Jenvu, Inc.</span>
      </div>
    </footer>
  );
}
