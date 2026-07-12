import { Link } from "@tanstack/react-router";

const LINKS: { label: string; to: string }[] = [
  { label: "About Us", to: "/about" },
  { label: "Contact Us", to: "/contact" },
  { label: "Privacy Policy", to: "/privacy" },
  { label: "Terms Conditions", to: "/terms" },
  { label: "Help Center", to: "/help" },
];

export default function DashboardFooter({ sidebarCollapsed = false }: { sidebarCollapsed?: boolean }) {
  const year = new Date().getFullYear();
  return (
    <footer
      className={`fixed bottom-0 right-0 left-0 z-30 border-t border-zinc-200 bg-[#FAFAFA] ${
        sidebarCollapsed ? "lg:left-[60px]" : "lg:left-[200px]"
      }`}
    >
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-5 gap-y-2 px-4 py-3 text-center text-[12px] text-zinc-600 sm:px-6">
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
