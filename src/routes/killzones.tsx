import { getIpGeo } from "@/lib/ip-geo";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Search, Clock, MapPin, Lock } from "lucide-react";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { PAIR_PROFILES, type PairProfile } from "@/lib/analysis/engine";

export const Route = createFileRoute("/killzones")({
  head: () => ({
    meta: [
      { title: "Killzone Times Tracker" },
      {
        name: "description",
        content:
          "Live ICT/SMC killzone times for EUR/USD — shown in UTC and your local timezone with real-time IN/OUT status.",
      },
      { property: "og:title", content: "EUR/USD Killzone Times Tracker" },
      {
        property: "og:description",
        content:
          "Live ICT/SMC killzone times for EUR/USD — shown in UTC and your local timezone with real-time IN/OUT status.",
      },
      { property: "og:url", content: "https://jenvu.com/killzones" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://jenvu.com/killzones" }],
  }),
  component: KillzonesPage,
});

const MONO = "font-['Google_Sans','Product_Sans','Roboto',system-ui,sans-serif] font-normal normal-case tracking-normal";

type Category = "FX";

const META: Record<string, { name: string; category: Category; region: string; flag: string }> = {
  EURUSD: { name: "Euro / US Dollar", category: "FX", region: "London / New York", flag: "🇪🇺" },
};

const CATEGORIES: (Category | "All")[] = ["All", "FX"];

// Gold market: closed Fri 22:00 UTC → Sun 22:00 UTC
function isMarketOpen(d: Date): boolean {
  const day = d.getUTCDay();
  const h = d.getUTCHours();
  if (day === 6) return false;
  if (day === 5 && h >= 22) return false;
  if (day === 0 && h < 22) return false;
  return true;
}

function pad(n: number) {
  return n.toString().padStart(2, "0");
}

function fmtUTC(h: number) {
  const hh = h === 24 ? 0 : h;
  return `${pad(hh)}:00`;
}

// Convert a UTC hour to a local HH:mm using the given IANA timezone.
function utcHourToLocal(hUTC: number, tz?: string): string {
  const d = new Date();
  d.setUTCHours(hUTC === 24 ? 0 : hUTC, 0, 0, 0);
  return d.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: tz,
  });
}

function shortTZ(): string {
  try {
    const parts = new Intl.DateTimeFormat([], { timeZoneName: "short" }).formatToParts(new Date());
    return parts.find(p => p.type === "timeZoneName")?.value || "Local";
  } catch {
    return "Local";
  }
}

function longTZ(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return "Local";
  }
}

function inZone(kz: { startUTC: number; endUTC: number }, h: number) {
  return kz.startUTC <= kz.endUTC
    ? h >= kz.startUTC && h < kz.endUTC
    : h >= kz.startUTC || h < kz.endUTC;
}

function nextStartInMs(startUTC: number, now: Date): number {
  const d = new Date(now);
  d.setUTCHours(startUTC === 24 ? 0 : startUTC, 0, 0, 0);
  if (d.getTime() <= now.getTime()) d.setUTCDate(d.getUTCDate() + 1);
  return d.getTime() - now.getTime();
}

function fmtCountdown(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}h ${pad(m)}m`;
  if (m > 0) return `${m}m ${pad(sec)}s`;
  return `${sec}s`;
}

function statusFor(profile: PairProfile, now: Date) {
  const h = now.getUTCHours();
  const active = profile.killzones.find(k => inZone(k, h));
  if (active) {
    const endHour = active.endUTC === 24 ? 0 : active.endUTC;
    const end = new Date(now);
    end.setUTCHours(endHour, 0, 0, 0);
    if (end.getTime() <= now.getTime()) end.setUTCDate(end.getUTCDate() + 1);
    return {
      inKillzone: true,
      label: active.name,
      countdown: `ends in ${fmtCountdown(end.getTime() - now.getTime())}`,
    };
  }
  // find next killzone
  let best: { kz: PairProfile["killzones"][number]; ms: number } | null = null;
  for (const kz of profile.killzones) {
    const ms = nextStartInMs(kz.startUTC, now);
    if (!best || ms < best.ms) best = { kz, ms };
  }
  return {
    inKillzone: false,
    label: "Outside killzone",
    countdown: best ? `${best.kz.name} in ${fmtCountdown(best.ms)}` : "",
  };
}

function KillzonesPage() {
  const navigate = useNavigate();
  const [now, setNow] = useState<Date | null>(null);
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState<(typeof CATEGORIES)[number]>("All");
  const [ipTZ, setIpTZ] = useState<string | null>(null);
  const [ipCity, setIpCity] = useState<string | null>(null);
  const tz = ipTZ ?? longTZ();
  const tzShort = useMemo(() => {
    try {
      const parts = new Intl.DateTimeFormat([], { timeZone: tz, timeZoneName: "short" })
        .formatToParts(new Date());
      return parts.find(p => p.type === "timeZoneName")?.value || "Local";
    } catch {
      return shortTZ();
    }
  }, [tz]);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);


  // Detect timezone from user IP (cached 24h). Falls back to browser TZ on error.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const j = await getIpGeo();
      if (cancelled || !j) return;
      if (j.timezone) setIpTZ(j.timezone);
      if (j.city || j.country_name)
        setIpCity([j.city, j.country_name].filter(Boolean).join(", "));
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const rows = useMemo(() => {
    const q = query.trim().toUpperCase();
    return Object.values(PAIR_PROFILES)
      .map(p => ({ profile: p, meta: META[p.key] }))
      .filter(r => r.meta)
      .filter(r => (cat === "All" ? true : r.meta.category === cat))
      .filter(
        r =>
          !q ||
          r.profile.key.includes(q) ||
          r.meta.name.toUpperCase().includes(q) ||
          r.meta.region.toUpperCase().includes(q),
      );
  }, [query, cat]);

  const grouped = useMemo(() => {
    const g: Record<Category, typeof rows> = {
      FX: [],
    };
    rows.forEach(r => g[r.meta.category].push(r));
    return g;
  }, [rows]);

  const utcNow = now ? now.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZone: "UTC",
  }) : "--:--:--";
  const localNow = now ? now.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZone: tz,
  }) : "--:--:--";


  return (
    <div className="public-cloudflare killzones-root min-h-dvh w-full bg-background text-foreground font-['Google_Sans','Product_Sans','Poppins',system-ui,sans-serif] antialiased">
      <SiteHeader />
      <main className="jenvu-home-content mx-auto max-w-[1296px] px-5 pb-16 sm:px-8">
        <div className="pb-10 pt-12 text-center md:pt-14">
          <span className="jenvu-rise inline-flex rounded-full bg-gc-blue-soft px-3 py-1 text-[13px] font-medium text-gc-blue-deep">Free tool · XAU/USD</span>
          <h1 className="jenvu-rise mt-5 text-[40px] font-medium leading-[1.1] tracking-[-0.5px] sm:text-[56px]">Gold killzones, live</h1>
          <p className="jenvu-rise [animation-delay:80ms] mx-auto mt-5 max-w-[720px] text-[17px] leading-[1.6] text-gc-ink-muted">
            ICT / SMC session windows for XAU/USD — shown in UTC and your local time, with a live in/out status.
          </p>
        </div>

        {/* Live clock strip */}
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div className="rounded-3xl border border-gc-line bg-background p-5 ">
            <div className={`${MONO} text-[10px] uppercase tracking-widest text-gc-ink-muted`}>UTC</div>
            <div className={`${MONO} text-xl sm:text-2xl font-semibold mt-1`}>{utcNow}</div>
          </div>
          <div className="rounded-3xl border border-gc-line bg-background p-5 ">
            <div className={`${MONO} text-[10px] uppercase tracking-widest text-gc-ink-muted`}>
              Local · {tzShort}
            </div>
            <div className={`${MONO} text-xl sm:text-2xl font-semibold mt-1`}>{localNow}</div>
          </div>
          <div className="col-span-2 sm:col-span-1 rounded-3xl border border-gc-line bg-background p-5 ">
            <div className={`${MONO} text-[10px] uppercase tracking-widest text-gc-ink-muted`}>
              {ipCity ? "Detected location" : "Timezone"}
            </div>
            <div className="text-sm font-medium mt-1 flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-gc-ink-muted" />
              <span className="truncate">{ipCity ?? tz}</span>
            </div>
            <div className={`${MONO} mt-1 text-[10px] text-gc-ink-muted truncate`}>
              {tz}
              {ipTZ ? " · via IP" : ""}
            </div>
          </div>
        </div>

        {/* Search + tabs */}
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gc-ink-muted" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search symbol, name or region…"
              className="w-full h-11 rounded-full border border-gc-line bg-background pl-9 pr-3 text-sm outline-none focus:border-gc-ink-muted transition"
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {CATEGORIES.map(c => (
              <button
                key={c}
                onClick={() => setCat(c)}
                className={`h-9 px-4 rounded-full border text-[12px] font-medium transition ${ cat === c ? "border-gc-blue bg-gc-blue text-gc-on-blue" : "border-border bg-background text-muted-foreground hover:border-home-accent/50" }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        {/* Groups */}
        <div className="space-y-8">
          {(Object.keys(grouped) as Category[]).map(section => {
            const items = grouped[section];
            if (!items.length) return null;
            return (
              <section key={section}>
                <div className="mb-3 flex items-center gap-2">
                  <h2 className={`${MONO} text-[11px] font-normal uppercase tracking-[0.2em] text-gc-ink-muted`}>
                    {section}
                  </h2>
                  <div className="h-px flex-1 bg-gc-line" />
                  <div className={`${MONO} text-[10px] text-gc-ink-muted`}>{items.length}</div>
                </div>

                <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2">
                  {items.map(({ profile, meta }) => {
                    const nowRef = now ?? new Date(0);
                    const st = statusFor(profile, nowRef);
                    const marketOpen = now ? isMarketOpen(nowRef) : false;

                    const locked = false;
                    return (
                      <button
                        key={profile.key}
                        onClick={() => {
                          navigate({ to: "/app" });
                        }}
                        className={`group text-left rounded-3xl border p-5 transition-all duration-300 hover:-translate-y-1 ${ locked ? "border-gc-line bg-gc-surface hover:border-gc-line" : "border-gc-line bg-background hover:border-gc-line " }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              
                              <span className={`${MONO} text-sm font-semibold ${locked ? "text-gc-ink-muted" : ""}`}>
                                {profile.key}
                              </span>
                              {locked && (
                                <span className={`${MONO} inline-flex items-center gap-1 rounded-md border border-gc-line bg-background px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-gc-ink-muted`}>
                                  <Lock className="h-2.5 w-2.5" /> Pro
                                </span>
                              )}
                              <span className="text-xs text-gc-ink-muted truncate">{meta.name}</span>
                            </div>
                            <div className="mt-1 flex items-center gap-1 text-[11px] text-gc-ink-muted">
                              <MapPin className="h-3 w-3" />
                              {meta.region}
                            </div>
                          </div>
                          <div
                            className={`shrink-0 inline-flex items-center gap-1.5 px-2 py-1 rounded-md ${MONO} text-[10px] uppercase tracking-wider ${ !marketOpen ? "bg-gc-yellow-soft text-gc-ink border border-gc-yellow-soft" : st.inKillzone ? "bg-gc-green-soft text-gc-green border border-gc-green-soft" : "bg-gc-surface text-gc-ink-muted border border-gc-line" }`}
                          >
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${
                                !marketOpen
                                  ? "bg-gc-yellow"
                                  : st.inKillzone
                                    ? "bg-gc-green animate-pulse"
                                    : "bg-gc-ink-muted"
                              }`}
                            />
                            {!marketOpen ? "Market Closed" : st.inKillzone ? "In Killzone" : "Outside"}
                          </div>
                        </div>


                        <div className="mt-3 space-y-1.5">
                          {profile.killzones.map(kz => {
                            const active = now ? inZone(kz, now.getUTCHours()) : false;
                            return (
                              <div
                                key={kz.name}
                                className={`flex items-center justify-between gap-2 rounded-md px-2.5 py-1.5 text-[11px] ${ active ? "bg-gc-green-soft border border-gc-green-soft" : "bg-gc-surface border border-gc-line" }`}
                              >
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <Clock className="h-3 w-3 text-gc-ink-muted shrink-0" />
                                  <span className="text-gc-ink truncate">{kz.name}</span>
                                </div>
                                <div className={`${MONO} text-[10.5px] text-gc-ink-muted text-right`}>
                                  <span>
                                    {fmtUTC(kz.startUTC)}–{fmtUTC(kz.endUTC)} UTC
                                  </span>
                                  <span className="mx-1 text-gc-line">·</span>
                                  <span className="text-gc-ink-muted">
                                    {utcHourToLocal(kz.startUTC, tz)}–{utcHourToLocal(kz.endUTC, tz)}{" "}
                                    {tzShort}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        <div className="mt-3 flex items-center justify-between">
                          <div className={`${MONO} text-[10.5px] text-gc-ink-muted`}>
                            Prime: {profile.primeSession.name} ·{" "}
                            {fmtUTC(profile.primeSession.startUTC)}–
                            {fmtUTC(profile.primeSession.endUTC)} UTC
                          </div>
                          <div
                            className={`${MONO} text-[10.5px] ${
                              st.inKillzone ? "text-gc-green" : "text-gc-ink-muted"
                            }`}
                          >
                            {st.countdown}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </section>
            );
          })}
          {rows.length === 0 && (
            <div className="rounded-xl border border-dashed border-gc-line bg-background p-10 text-center text-sm text-gc-ink-muted">
              No instruments match your search.
            </div>
          )}
        </div>

        <p className="mt-10 text-center text-[13px] text-gc-ink-muted">
          Local times are converted from UTC using your device timezone. Killzones show when EUR/USD is usually most active — they don't guarantee a setup.
        </p>
      </main>
      <div className="hide-in-pwa"><SiteFooter /></div>
    </div>
  );
}
