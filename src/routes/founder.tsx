import { createFileRoute, Link } from "@tanstack/react-router";
import { Award, AlertTriangle, ArrowRight, Check } from "lucide-react";
import SiteHeader from "@/components/SiteHeader";
import BlogFooter from "@/components/BlogFooter";
import founderPhoto from "@/assets/haseeb-ijaz-founder.png.asset.json";

const SANS = "font-['Google_Sans','Product_Sans','Poppins',system-ui,sans-serif]";

export const Route = createFileRoute("/founder")({
  head: () => ({
    meta: [
      { title: "Haseeb Ijaz — Founder of Jenvu" },
      { name: "description", content: "Meet Haseeb Ijaz, founder of Jenvu. At 21, he built an AI Fiber trading platform powered by ICT, SMC and rule-based chart analysis." },
      { property: "og:title", content: "Haseeb Ijaz — Founder of Jenvu" },
      { property: "og:description", content: "At 21, Haseeb Ijaz founded Jenvu to bring structured Fiber trading analysis into every serious trader's chart workflow." },
      { property: "og:url", content: "https://jenvu.com/founder" },
      { property: "og:type", content: "profile" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://jenvu.com/founder" }],
  }),
  component: FounderPage,
});

const BIO = [
  "Haseeb Ijaz started Jenvu at age 21 with a single conviction: structured Fiber analysis should not be locked behind an expensive terminal or a Wall Street desk.",
  "He spent years studying ICT, SMC, liquidity and market structure on Fiber. The patterns were repeatable, but the tools were scattered. So he built the platform he wished he had at 18 — AI-assisted and honest about risk.",
  "Beyond the Terminal, Haseeb has sharpened 25 skills spanning market research, product marketing, community building and AI-driven growth.",
  "Today Jenvu brings those disciplines into one platform that reads the Fiber chart live, marks the structure, and tells traders when there is no clear setup.",
];

const IDEAS = [
  "Analyze Fiber through deeply specialized, rule-based engines",
  "Explain the setup in plain language so traders can check it",
  "Only highlight setups when bias, structure, liquidity and timing align",
  "Say so clearly when the market offers no clear edge",
  "Never promise profits or fixed win rates",
  "Stay fast, private and accessible to traders everywhere",
];

function FounderPage() {
  return (
    <div className={`min-h-dvh w-full bg-background text-gc-ink ${SANS} antialiased`}>
      <SiteHeader />
      <div className="jenvu-home-content">
        <main>
          <section className="bg-background">
            <div className="mx-auto max-w-[1296px] px-5 pb-12 pt-12 text-center sm:px-8 md:pt-14">
              <span className="jenvu-rise inline-flex rounded-full bg-gc-blue-soft px-3 py-1 text-[13px] font-medium text-gc-blue-deep">Founder</span>
              <h1 className="jenvu-rise mx-auto mt-5 max-w-[900px] text-[40px] font-medium leading-[1.1] tracking-[-0.5px] sm:text-[56px]">
                The founder behind Jenvu
              </h1>
              <p className="jenvu-rise [animation-delay:80ms] mx-auto mt-5 max-w-[720px] text-[17px] leading-[1.6] text-gc-ink-muted">
                Haseeb Ijaz started Jenvu at 21 to give independent Fiber traders the same structured view of the market that big desks use.
              </p>
            </div>
          </section>

          <section className="bg-background">
            <div className="mx-auto grid max-w-[1296px] items-start gap-10 px-5 pb-16 sm:px-8 md:grid-cols-[0.9fr_1.3fr]">
              <div className="ind-rise">
                <div className="aspect-square overflow-hidden rounded-[28px] bg-gc-surface">
                  <img src={founderPhoto.url} alt="Haseeb Ijaz — Founder of Jenvu" width={1024} height={1024} className="h-full w-full object-cover" />
                </div>
                <div className="mt-4 space-y-3">
                  <div className="flex items-center gap-4 rounded-md border border-gc-line p-4">
                    <span className="flex h-11 w-11 items-center justify-center rounded-full bg-gc-blue-soft"><Award className="h-5 w-5 text-gc-blue" /></span>
                    <div>
                      <p className="text-[15px] font-medium">Founded at age 21</p>
                      <p className="text-[13px] text-gc-ink-muted">Jenvu · XAU/USD trading platform</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 rounded-md border border-gc-line p-4">
                    <span className="flex h-11 w-11 items-center justify-center rounded-full bg-gc-yellow-soft"><AlertTriangle className="h-5 w-5 text-gc-yellow" /></span>
                    <div>
                      <p className="text-[15px] font-medium">Pakistan No. #1 Scams Awareness Provider</p>
                      <p className="text-[13px] text-gc-ink-muted">Protecting people online</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="space-y-5 text-left">
                <div>
                  <h2 className="text-[32px] font-medium leading-tight">Haseeb Ijaz</h2>
                  <p className="mt-1 text-[15px] text-gc-ink-muted">Founder & Architect</p>
                </div>
                <p className="text-[20px] text-gc-ink">Built for traders who refuse to guess.</p>
                {BIO.map((p) => (
                  <p key={p} className="text-[16px] leading-[1.7] text-gc-ink-muted">{p}</p>
                ))}
              </div>
            </div>
          </section>

          <section className="bg-gc-surface">
            <div className="mx-auto max-w-[1296px] px-5 py-16 sm:px-8 lg:py-20">
              <h2 className="text-center text-[32px] font-medium leading-[1.2] sm:text-[40px]">The idea behind Jenvu</h2>
              <p className="mx-auto mt-4 max-w-[640px] text-center text-[16px] leading-[1.6] text-gc-ink-muted">
                The best trading ideas come from a clean, structured read of the market — not from chasing alerts.
              </p>
              <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {IDEAS.map((item, i) => (
                  <li key={item} className="ind-rise flex items-start gap-4 rounded-3xl bg-background p-6" style={{ animationDelay: `${i * 60}ms` }}>
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gc-green-soft"><Check className="h-4 w-4 text-gc-green" /></span>
                    <span className="text-[15px] leading-[1.6]">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <section className="bg-background">
            <div className="mx-auto max-w-[900px] px-5 py-16 text-center sm:px-8 lg:py-20">
              <h2 className="text-[32px] font-medium leading-[1.2] sm:text-[40px]">Start trading with the same view</h2>
              <p className="mt-4 text-[16px] text-gc-ink-muted">Pick a plan and open the Terminal Haseeb built.</p>
              <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Link to="/pricing" className="inline-flex h-12 items-center gap-2 rounded-full bg-gc-blue px-6 text-[16px] font-medium text-gc-on-blue hover:bg-gc-blue-hover">
                  Buy now <ArrowRight className="h-4 w-4" />
                </Link>
                <Link to="/founding" className="inline-flex h-12 items-center rounded-full border border-gc-line px-6 text-[16px] font-medium text-gc-ink hover:bg-gc-surface">
                  Founding Program
                </Link>
              </div>
            </div>
          </section>
        </main>
      </div>
      <div className="hide-in-pwa"><BlogFooter /></div>
    </div>
  );
}
