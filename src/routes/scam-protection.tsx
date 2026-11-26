import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { ChevronRight, Globe, Building2, MessageCircleWarning, CreditCard, Loader2, Search } from "lucide-react";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { Button } from "@/components/ui/button";
import { useAuthUser } from "@/hooks/useAuthUser";
import founderPhoto from "@/assets/haseeb-ijaz-founder.png.asset.json";
import { scamToolCheck, type ScamToolResult } from "@/lib/scam-check/scam-tool.functions";
import { getScamReport, trackScamView } from "@/lib/scam-check/scam-stats.functions";
import { dayTrend, type ScamReport } from "@/lib/scam-check/scam-stats";

export const Route = createFileRoute("/scam-protection")({
  loader: () => getScamReport(),
  head: () => ({
    meta: [
      { title: "Scam Protection — Check Before You Pay | Jenvu" },
      {
        name: "description",
        content:
          "Jenvu Scam Protection: check brokers, websites, payment methods and signal sellers before you send money. Founded by Haseeb Ijaz with a public daily report.",
      },
      { property: "og:title", content: "Scam Protection — Check Before You Pay" },
      {
        property: "og:description",
        content: "Check brokers, links, payment methods and signal sellers, and follow the live daily scam report.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://jenvu.com/scam-protection" }],
  }),
  component: ScamProtectionPage,
});

type Kind = "broker" | "link" | "seller" | "payment";
const TABS: { kind: Kind; label: string; icon: typeof Globe; placeholder: string }[] = [
  { kind: "link", label: "Website link", icon: Globe, placeholder: "https://example-broker.com" },
  { kind: "payment", label: "Payment method", icon: CreditCard, placeholder: "USDT address, IBAN, PayPal email…" },
  { kind: "broker", label: "Broker / firm", icon: Building2, placeholder: "e.g. XYZ Capital Markets" },
  { kind: "seller", label: "Signal seller", icon: MessageCircleWarning, placeholder: "@trading_guru or guru@gmail.com" },
];

const nf = new Intl.NumberFormat("en-US");
const fmtDate = (d: string, opts: Intl.DateTimeFormatOptions) =>
  new Date(`${d}T00:00:00Z`).toLocaleDateString("en-US", { timeZone: "UTC", ...opts });

function GridBg({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute inset-0 opacity-60 [background-image:linear-gradient(to_right,var(--border)_1px,transparent_1px),linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] [background-size:60px_60px] [mask-image:linear-gradient(to_bottom,transparent,black_20%,black_80%,transparent)] ${className}`}
    />
  );
}

function ShieldSketch() {
  return (
    <svg viewBox="0 0 520 360" className="h-full w-full text-muted-foreground/40" fill="none" stroke="currentColor" aria-hidden>
      {Array.from({ length: 9 }).map((_, i) => (
        <path key={`h${i}`} d={`M${40 + i * 6} ${300 - i * 28} L${480 - i * 6} ${260 - i * 28}`} strokeWidth="0.6" />
      ))}
      {Array.from({ length: 12 }).map((_, i) => (
        <path key={`v${i}`} d={`M${60 + i * 36} ${305 - i * 4} L${90 + i * 32} ${60 - i * 2}`} strokeWidth="0.5" />
      ))}
      <path d="M260 40 L360 80 Q360 220 260 300 Q160 220 160 80 Z" strokeWidth="2" className="text-foreground/50" />
      <path d="M260 62 L340 94 Q338 205 260 272 Q182 205 180 94 Z" strokeWidth="1" className="text-foreground/30" />
      <path d="M220 170 L250 200 L305 140" strokeWidth="3" strokeLinecap="round" className="text-foreground/60" />
      <circle cx="400" cy="250" r="44" strokeWidth="1.5" />
      <path d="M432 282 L470 320" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}

function Scanner() {
  const { user, loading: authLoading } = useAuthUser();
  const [kind, setKind] = useState<Kind>("link");
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ScamToolResult | null>(null);
  const run = useServerFn(scamToolCheck);
  const tab = TABS.find((t) => t.kind === kind) ?? TABS[0]!;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!value.trim() || busy) return;
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      setResult(await run({ data: { kind, value: value.trim() } }));
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : "Could not run the check. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  const tone =
    result?.verdict === "scam"
      ? "text-destructive"
      : result?.verdict === "suspicious"
        ? "text-foreground"
        : "text-muted-foreground";
  const title = result?.verdict === "scam" ? "Likely scam" : result?.verdict === "suspicious" ? "Suspicious" : "No major red flags";

  return (
    <div className="rounded-3xl bg-secondary p-5 sm:p-8">
      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.kind}
            type="button"
            onClick={() => {
              setKind(t.kind);
              setValue("");
              setResult(null);
            }}
            className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-[14px] transition ${
              kind === t.kind ? "bg-foreground text-background" : "bg-background text-foreground hover:bg-muted"
            }`}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
          </button>
        ))}
      </div>
      <form onSubmit={submit} className="mt-5 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <tab.icon className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={tab.placeholder}
            aria-label={tab.label}
            className="h-12 w-full rounded-full border border-border bg-background pl-12 pr-4 text-[15px] outline-none focus:border-foreground"
          />
        </div>
        {!authLoading && !user ? (
          <Button asChild className="h-12 rounded-full px-6">
            <Link to="/auth">Sign in to check</Link>
          </Button>
        ) : (
          <Button type="submit" disabled={!value.trim() || busy} className="h-12 rounded-full px-6">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            {busy ? "Checking…" : "Check now"}
          </Button>
        )}
      </form>
      <p className="mt-3 text-[13px] text-muted-foreground">
        Free for every signed-in account. We read the text you paste; we never visit links or move money.
      </p>
      {error && <p className="mt-4 text-[14px] text-destructive">{error}</p>}
      {result && (
        <div className="mt-6 rounded-2xl bg-background p-5 sm:p-6">
          <div className="flex items-baseline justify-between gap-4">
            <h3 className={`text-[22px] font-medium ${tone}`}>{title}</h3>
            <span className={`text-[28px] font-medium tabular-nums ${tone}`}>{result.score}/100</span>
          </div>
          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div className="h-full bg-foreground" style={{ width: `${result.score}%` }} />
          </div>
          <p className="mt-4 text-[15px] text-foreground">{result.summary}</p>
          {result.flags.length > 0 && (
            <ul className="mt-4 space-y-2 text-[14px] text-muted-foreground">
              {result.flags.map((f, i) => (
                <li key={i}>
                  <span className="font-medium text-foreground">{f.label}</span>
                  {f.detail ? ` — ${f.detail}` : ""}
                </li>
              ))}
            </ul>
          )}
          {result.checklist.length > 0 && (
            <ul className="mt-4 list-disc space-y-1 pl-5 text-[14px] text-muted-foreground">
              {result.checklist.map((c, i) => (
                <li key={i}>{c}</li>
              ))}
            </ul>
          )}
          <p className="mt-4 text-[14px] font-medium text-foreground">{result.recommendation}</p>
        </div>
      )}
    </div>
  );
}

function Timeline({ report }: { report: ScamReport }) {
  const days = report.days;
  const [idx, setIdx] = useState(days.length - 1);
  const day = days[idx] ?? days[days.length - 1]!;
  const trend = dayTrend(days, idx);
  const daysAgo = days.length - 1 - idx;
  const bad = day.flagged + day.suspicious;
  const headline =
    day.scans === 0
      ? "No checks run this day"
      : trend === "up"
        ? "Scam finds increased"
        : trend === "down"
          ? "Scam finds decreased"
          : trend === "flat"
            ? "Scam finds held steady"
            : `${nf.format(day.scans)} checks run`;
  const stops = useMemo(() => [0, 5, 10, 15, 20, 25, days.length - 1], [days.length]);

  return (
    <section className="site-edge mx-auto max-w-[1240px] px-5 py-24 sm:px-8">
      <p className="text-[14px] text-muted-foreground">Daily report</p>
      <h2 className="mt-6 text-[32px] font-normal tracking-tight sm:text-[40px]">
        {daysAgo === 0 ? "Today" : `${daysAgo} ${daysAgo === 1 ? "day" : "days"} ago`}
      </h2>
      <div className="relative mt-14">
        <div className="absolute left-0 right-0 top-1/2 h-px -translate-y-1/2 bg-border" />
        <div
          className="absolute left-0 top-1/2 h-px -translate-y-1/2 bg-foreground"
          style={{ width: `${(idx / Math.max(1, days.length - 1)) * 100}%` }}
        />
        {stops.map((s) => (
          <button
            key={s}
            type="button"
            aria-label={fmtDate(days[s]!.day, { month: "short", day: "numeric" })}
            onClick={() => setIdx(s)}
            className="absolute top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-foreground"
            style={{ left: `${(s / Math.max(1, days.length - 1)) * 100}%` }}
          />
        ))}
        <input
          type="range"
          min={0}
          max={days.length - 1}
          value={idx}
          onChange={(e) => setIdx(Number(e.target.value))}
          aria-label="Pick a day"
          className="relative z-10 h-6 w-full cursor-pointer appearance-none bg-transparent [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-foreground [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-foreground"
        />
      </div>
      <div className="mt-4 flex justify-between text-[13px] text-muted-foreground/70">
        <span>{fmtDate(days[0]!.day, { month: "short", day: "numeric" })}</span>
        <span>{fmtDate(days[days.length - 1]!.day, { month: "short", day: "numeric" })}</span>
      </div>
      <div className="mt-12 text-center">
        <p className="text-[14px] text-muted-foreground/70">{fmtDate(day.day, { month: "long", day: "numeric", year: "numeric" })}</p>
        <h3 className="mt-3 text-[28px] font-normal tracking-tight">{headline}</h3>
        <p className="mx-auto mt-3 max-w-xl text-[16px] text-muted-foreground">
          {nf.format(day.views)} page views · {nf.format(day.scans)} checks · {nf.format(bad)} flagged
          {day.scans > 0 ? ` (${Math.round((bad / day.scans) * 100)}% of checks)` : ""}
        </p>
      </div>
    </section>
  );
}

function ScamProtectionPage() {
  const report = Route.useLoaderData();
  const track = useServerFn(trackScamView);
  useEffect(() => {
    track().catch(() => {});
  }, [track]);

  const change = report.flaggedShareChange;
  const changeText = change === null ? "—" : `${change > 0 ? "+" : ""}${change}`;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <main>
        {/* Hero */}
        <section className="site-edge relative mx-auto grid max-w-[1240px] items-center gap-10 px-5 pb-16 pt-20 sm:px-8 lg:grid-cols-2 lg:pt-32">
          <div>
            <div className="flex items-center gap-3">
              <span className="text-[13px] font-medium uppercase tracking-[0.3em]">Jenvu Shield</span>
              <a
                href="#check"
                className="inline-flex items-center gap-1 rounded-full bg-secondary px-3 py-1 text-[13px] text-foreground hover:bg-muted"
              >
                New: free scam checks <ChevronRight className="h-3.5 w-3.5" />
              </a>
            </div>
            <h1 className="mt-6 text-[44px] font-normal leading-[1.05] tracking-tight sm:text-[64px]">
              Check before
              <br />
              you pay.
            </h1>
            <p className="mt-6 max-w-[560px] text-[18px] leading-relaxed text-muted-foreground">
              Fake brokers, cloned websites, crypto drainers and paid signal groups take money from traders every day.
              Paste a link, payment method, broker or seller and see the warning signs in seconds.
            </p>
          </div>
          <div className="hidden h-[360px] lg:block">
            <ShieldSketch />
          </div>
        </section>

        {/* Tool */}
        <section id="check" className="site-edge mx-auto max-w-[1240px] scroll-mt-24 px-5 pb-20 sm:px-8">
          <Scanner />
        </section>

        {/* Giant stat */}
        <section className="relative overflow-hidden py-24">
          <GridBg />
          <div className="site-edge relative mx-auto max-w-[1240px] px-5 sm:px-8">
            <p className="text-[88px] font-normal leading-none tracking-tighter tabular-nums sm:text-[160px] lg:text-[200px]">
              {nf.format(report.monthlyViews)}
            </p>
            <p className="mt-6 flex items-center gap-4 text-[17px] sm:text-[20px]">
              <span className="h-px w-12 bg-destructive" />
              Scam Protection page views in the last 30 days
            </p>
          </div>
        </section>

        {/* Founder */}
        <section className="site-edge mx-auto grid max-w-[1240px] items-center gap-12 px-5 py-24 sm:px-8 lg:grid-cols-2">
          <div>
            <p className="text-[14px] text-muted-foreground">The founder</p>
            <h2 className="mt-4 text-[36px] font-normal leading-tight tracking-tight sm:text-[44px]">
              Haseeb Ijaz is stopping scams
            </h2>
            <p className="mt-6 max-w-[540px] text-[17px] leading-relaxed text-muted-foreground">
              Haseeb Ijaz, founder of Jenvu and scam awareness provider, has watched traders lose savings to fake
              brokers, “guaranteed profit” account managers and copied payment pages. He built Jenvu Shield so anyone
              can check a website, payment request or seller before sending a single dollar, and publishes the daily
              numbers below so the work stays open.
            </p>
            <Link to="/founder" className="mt-6 inline-flex items-center gap-1 text-[15px] font-medium underline-offset-4 hover:underline">
              Meet Haseeb <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="overflow-hidden rounded-3xl bg-secondary">
            <img
              src={founderPhoto.url}
              alt="Haseeb Ijaz, founder of Jenvu and scam awareness provider"
              width={1024}
              height={1024}
              loading="lazy"
              className="aspect-[4/3] h-full w-full object-cover"
            />
          </div>
        </section>

        {/* By the numbers */}
        <section className="site-edge mx-auto max-w-[1240px] px-5 py-24 sm:px-8">
          <div className="grid gap-8 lg:grid-cols-2">
            <div>
              <p className="text-[14px] text-muted-foreground">By the numbers</p>
              <h2 className="mt-4 text-[36px] font-normal tracking-tight sm:text-[44px]">Live scam report</h2>
            </div>
            <p className="text-[17px] leading-relaxed text-muted-foreground">
              Every figure is counted from real use of this page and its checker over the last 30 days. Nothing is
              estimated or rounded up.
            </p>
          </div>
          <div className="mt-12 grid overflow-hidden rounded-3xl bg-secondary sm:grid-cols-2 lg:grid-cols-4">
            {[
              { v: nf.format(report.monthlyViews), u: "views", d: "Monthly page views of Scam Protection" },
              { v: nf.format(report.monthlyScans), u: "checks", d: "Scam tool checks run by members" },
              { v: changeText, u: change === null ? "" : "pts", d: "Change in flagged share, last 7 days vs the 7 before" },
              { v: nf.format(report.monthlyFlagged), u: "scams", d: "Inputs the tool flagged as a likely scam" },
            ].map((c, i) => (
              <div key={i} className={`p-8 ${i > 0 ? "border-border sm:border-l" : ""} ${i > 1 ? "lg:border-l" : ""}`}>
                <p className="flex items-baseline gap-2">
                  <span className="text-[48px] font-normal leading-none tracking-tight tabular-nums sm:text-[56px]">{c.v}</span>
                  <span className="text-[16px]">{c.u}</span>
                </p>
                <p className="mt-6 max-w-[220px] text-[15px] text-muted-foreground">{c.d}</p>
              </div>
            ))}
          </div>
          {report.flaggedShare !== null && (
            <p className="mt-4 text-[13px] text-muted-foreground">
              {report.flaggedShare}% of all checks in the last 30 days were flagged as a scam or suspicious.
            </p>
          )}
        </section>

        <Timeline report={report} />
      </main>
      <SiteFooter />
    </div>
  );
}
