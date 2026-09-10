import { Link } from "@tanstack/react-router";

export default function CloudflareHero() {
  return (
    <section className="relative mx-auto w-full max-w-[1184px] px-3 pb-1 pt-2 sm:px-5">
      <div className="relative flex min-h-[500px] overflow-hidden rounded-[14px] bg-home-accent px-5 py-14 sm:min-h-[570px] sm:px-10 sm:py-20">
        <div className="hero-dot-field pointer-events-none absolute inset-0" />
        <div className="hero-bottom-glow pointer-events-none absolute inset-x-0 bottom-0 h-2/3" />

        <div className="relative z-10 m-auto w-full max-w-[760px] text-center text-home-accent-foreground">
          <div className="mx-auto inline-flex max-w-[326px] flex-wrap items-center justify-center gap-x-1.5 gap-y-1 rounded-md border border-primary-foreground/50 px-3 py-2.5 text-center text-[10px] leading-[1.35] text-home-accent-foreground sm:max-w-full sm:py-2 sm:text-[11px] sm:leading-none">
            <span className="font-medium">Jenvu 2026</span>
            <span className="text-home-accent-foreground">·</span>
            <span>The Agentic Trading Network of the Year</span>
            <span className="text-home-accent-foreground">·</span>
            <span>Live 24/7</span>
            <span className="text-home-accent-foreground">·</span>
            <Link to="/founding" className="font-medium underline underline-offset-2">
              Register
            </Link>
          </div>

          <h1 className="mx-auto mt-8 max-w-[330px] text-center text-[34px] font-semibold leading-[1.05] tracking-normal text-home-accent-foreground sm:max-w-[740px] sm:text-[44px] sm:leading-[0.98] md:text-[48px]">
             Everything we learned from powering gold trading
          </h1>

          <p className="mx-auto mt-8 max-w-[320px] text-center text-[13px] leading-[1.45] text-home-accent-foreground sm:max-w-xl sm:text-sm sm:leading-[1.25]">
            One platform for your signals, voice agent, and trading desk.
            <br className="hidden sm:block" />{" "}
            <span className="sm:hidden"> </span>Deploy, analyze, and scale without managing infrastructure.
          </p>

          <div className="mt-10 flex items-center justify-center">
            <Link
              to="/founding"
              className="inline-flex min-h-9 items-center justify-center rounded-full bg-background px-6 text-xs font-semibold text-foreground shadow-sm transition hover:bg-secondary"
            >
              Start trading for free
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
