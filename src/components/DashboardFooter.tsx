import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";

const LINKS: { label: string; to: string }[] = [
  { label: "About Us", to: "/about" },
  { label: "Contact Us", to: "/contact" },
  { label: "Privacy Policy", to: "/privacy" },
  { label: "Terms Conditions", to: "/terms" },
  { label: "Help Center", to: "/help" },
];

export default function DashboardFooter({ sidebarCollapsed = false }: { sidebarCollapsed?: boolean }) {
  const year = new Date().getFullYear();
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    // Only apply scroll behavior on mobile (< 1024px)
    let lastY = window.scrollY;
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(() => {
        const y = window.scrollY;
        if (window.innerWidth >= 1024) {
          setHidden(false);
        } else if (y < 10) {
          setHidden(true);
        } else if (y > lastY + 4) {
          // scrolling down → show
          setHidden(false);
        } else if (y < lastY - 4) {
          // scrolling up → hide
          setHidden(true);
        }
        lastY = y;
        ticking = false;
      });
    };
    // initial: hide on mobile until user scrolls down
    if (window.innerWidth < 1024) setHidden(true);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return (
    <footer
      className={`fixed bottom-0 right-0 left-0 z-30 border-t border-zinc-200 bg-[#FAFAFA] transition-transform duration-300 ${
        sidebarCollapsed ? "lg:left-[60px]" : "lg:left-[200px]"
      } ${hidden ? "translate-y-full lg:translate-y-0" : "translate-y-0"}`}
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
