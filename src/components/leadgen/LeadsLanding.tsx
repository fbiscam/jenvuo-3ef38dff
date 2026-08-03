import { Link } from "@tanstack/react-router";
import {
  MapPin,
  Users,
  Globe,
  Upload,
  ListChecks,
  ShieldCheck,
  Sparkles,
  Check,
} from "lucide-react";

const FEATURES = [
  {
    icon: MapPin,
    title: "Google Maps search",
    desc: "Pull local businesses by category and city — name, address, phone, website, rating and review count, ready to work.",
  },
  {
    icon: Users,
    title: "People search",
    desc: "Find decision makers behind a company: role, seniority and verified work email where available.",
  },
  {
    icon: Globe,
    title: "Website enrichment",
    desc: "Crawl any domain and extract emails, phone numbers and social profiles the contact page never lists.",
  },
  {
    icon: Upload,
    title: "CSV import",
    desc: "Bring your own list. We dedupe against everything you already saved so you never pay twice for a lead.",
  },
  {
    icon: ListChecks,
    title: "Lists & pipeline status",
    desc: "Group leads into campaign lists and move them through New → Contacted → Qualified → Won.",
  },
  {
    icon: ShieldCheck,
    title: "Transparent credits",
    desc: "Search is free. You only spend credits when you save or reveal a lead — every charge is logged in Activity.",
  },
];

const STEPS = [
  "Create your free account and get 50 credits instantly.",
  "Search Maps, people or enrich a website — results are free to browse.",
  "Save only the leads you want. Export to CSV and start outreach.",
];

export function LeadsLanding() {
  return (
    <div className="lg-console min-h-dvh bg-white text-[#202124]">
      {/* Top bar */}
      <header className="sticky top-0 z-20 border-b border-[#DADCE0] bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
          <div className="flex items-center gap-2.5">
            <img src="/favicon.png" alt="Jenvu" className="h-7 w-7 rounded object-contain" />
            <span className="text-[17px] tracking-tight">
              Jenvu <span className="text-[#5F6368]">Leads</span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/leads-signin"
              className="rounded px-4 py-2 text-[13px] font-medium text-[#1A73E8] hover:bg-[#F1F3F4]"
            >
              Sign in
            </Link>
            <Link
              to="/leads-signup"
              className="rounded bg-[#1A73E8] px-4 py-2 text-[13px] font-medium text-white hover:bg-[#1B66C9]"
            >
              Create free account
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-5 pb-16 pt-16 sm:pt-24">
        <div className="max-w-3xl">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#DADCE0] bg-[#F8F9FA] px-3 py-1 text-[12px] font-medium text-[#5F6368]">
            <Sparkles className="h-3.5 w-3.5 text-[#1A73E8]" />
            50 free credits on sign-up — no card required
          </span>
          <h1 className="mt-6 text-[36px] font-normal leading-[1.15] tracking-tight sm:text-[52px]">
            B2B leads you can actually
            <br className="hidden sm:block" /> reach — in one desk.
          </h1>
          <p className="mt-5 max-w-2xl text-[16px] leading-relaxed text-[#5F6368]">
            Jenvu Leads combines Google Maps business data, people search and live website
            enrichment into a single workspace. Search for free, save what matters, export and
            start selling.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              to="/leads-signup"
              className="rounded bg-[#1A73E8] px-6 py-3 text-[14px] font-medium text-white hover:bg-[#1B66C9]"
            >
              Get 50 free credits
            </Link>
            <Link
              to="/leads-signin"
              className="rounded border border-[#DADCE0] px-6 py-3 text-[14px] font-medium text-[#3C4043] hover:bg-[#F8F9FA]"
            >
              Sign in
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-y border-[#E8EAED] bg-[#F8F9FA] py-16">
        <div className="mx-auto max-w-6xl px-5">
          <h2 className="text-[26px] font-normal tracking-tight">Everything the desk does</h2>
          <p className="mt-2 max-w-2xl text-[14px] text-[#5F6368]">
            No scraping scripts, no spreadsheets glued together. One console for sourcing,
            enriching and organising your pipeline.
          </p>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="rounded-lg border border-[#DADCE0] bg-white p-6 transition-shadow hover:shadow-[0_1px_3px_rgba(60,64,67,.15)]"
              >
                <f.icon className="h-6 w-6 text-[#1A73E8]" strokeWidth={1.6} />
                <h3 className="mt-4 text-[15px] font-medium">{f.title}</h3>
                <p className="mt-2 text-[13px] leading-relaxed text-[#5F6368]">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works + credits */}
      <section className="mx-auto grid max-w-6xl gap-10 px-5 py-16 lg:grid-cols-2">
        <div>
          <h2 className="text-[26px] font-normal tracking-tight">How it works</h2>
          <ol className="mt-6 space-y-4">
            {STEPS.map((s, i) => (
              <li key={s} className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#E8F0FE] text-[12px] font-medium text-[#1A73E8]">
                  {i + 1}
                </span>
                <span className="text-[14px] leading-relaxed text-[#3C4043]">{s}</span>
              </li>
            ))}
          </ol>
        </div>

        <div className="rounded-lg border border-[#DADCE0] bg-white p-7">
          <div className="text-[12px] font-medium uppercase tracking-wide text-[#5F6368]">
            Free plan
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-[44px] font-normal leading-none">50</span>
            <span className="text-[15px] text-[#5F6368]">credits included</span>
          </div>
          <p className="mt-3 text-[13px] text-[#5F6368]">
            A saved or revealed lead costs 0.5 credits — that is <strong>100 leads free</strong> to
            start. Searching and previewing results never costs anything.
          </p>
          <ul className="mt-6 space-y-2.5">
            {[
              "Maps, people and website enrichment",
              "Unlimited searching and previews",
              "Campaign lists + pipeline status",
              "CSV export and duplicate protection",
              "Full credit activity log",
            ].map((x) => (
              <li key={x} className="flex items-start gap-2 text-[13px] text-[#3C4043]">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#188038]" />
                {x}
              </li>
            ))}
          </ul>
          <Link
            to="/leads-signup"
            className="mt-7 block rounded bg-[#1A73E8] px-5 py-3 text-center text-[14px] font-medium text-white hover:bg-[#1B66C9]"
          >
            Create free account
          </Link>
          <p className="mt-3 text-center text-[12px] text-[#80868B]">
            Need more volume? Ask an administrator to raise your monthly limit.
          </p>
        </div>
      </section>

      <footer className="border-t border-[#E8EAED] py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-5 text-[12px] text-[#80868B] sm:flex-row">
          <span>© {new Date().getFullYear()} Jenvu — leads.jenvu.com</span>
          <div className="flex items-center gap-4">
            <a href="https://jenvu.com" className="hover:text-[#1A73E8]">
              Jenvu home
            </a>
            <a href="https://support.jenvu.com" className="hover:text-[#1A73E8]">
              Support
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
