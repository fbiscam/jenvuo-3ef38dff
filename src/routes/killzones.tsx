import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Search, Clock, MapPin, Zap } from "lucide-react";
import { PAIR_PROFILES, type PairProfile } from "@/lib/analysis/engine";

export const Route = createFileRoute("/killzones")({
  head: () => ({
    meta: [
      { title: "Killzone Times Tracker" },
      {
        name: "description",
        content:
          "Live ICT/SMC killzone times for Gold, Forex, JPY pairs, Indices and Crypto — shown in UTC and your local timezone with real-time IN/OUT status.",
      },
      { property: "og:title", content: "Killzone Times Tracker" },
      {
        property: "og:description",
        content:
          "Live ICT/SMC killzone times for Gold, Forex, JPY pairs, Indices and Crypto — shown in UTC and your local timezone with real-time IN/OUT status.",
      },
      { property: "og:url", content: "https://jenvu.com/killzones" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://jenvu.com/killzones" }],
  }),
  component: KillzonesPage,
});

const MONO = "font-['JetBrains_Mono',ui-monospace,monospace]";

type Category = "Metals" | "Forex" | "JPY" | "Indices" | "Crypto";

const META: Record<string, { name: string; category: Category; region: string; flag: string }> = {
  XAUUSD: { name: "Gold", category: "Metals", region: "London / New York", flag: "🥇" },
  XAGUSD: { name: "Silver", category: "Metals", region: "London / New York", flag: "🥈" },
  EURUSD: { name: "Euro / US Dollar", category: "Forex", region: "London", flag: "🇪🇺" },
  GBPUSD: { name: "Pound / US Dollar", category: "Forex", region: "London", flag: "🇬🇧" },
  USDJPY: { name: "US Dollar / Yen", category: "JPY", region: "Tokyo / London", flag: "🇯🇵" },
  EURJPY: { name: "Euro / Yen", category: "JPY", region: "Tokyo / London", flag: "🇯🇵" },
  GBPJPY: { name: "Pound / Yen", category: "JPY", region: "Tokyo / London", flag: "🇯🇵" },
  AUDUSD: { name: "Aussie / US Dollar", category: "Forex", region: "Sydney / Tokyo", flag: "🇦🇺" },
  NZDUSD: { name: "Kiwi / US Dollar", category: "Forex", region: "Sydney / Tokyo", flag: "🇳🇿" },
  USDCAD: { name: "US Dollar / Loonie", category: "Forex", region: "New York", flag: "🇨🇦" },
  NAS100: { name: "Nasdaq 100", category: "Indices", region: "New York", flag: "🇺🇸" },
  SPX500: { name: "S&P 500", category: "Indices", region: "New York", flag: "🇺🇸" },
  US30: { name: "Dow Jones 30", category: "Indices", region: "New York", flag: "🇺🇸" },
  BTCUSD: { name: "Bitcoin", category: "Crypto", region: "24/7 · NY / Asia", flag: "₿" },
  ETHUSD: { name: "Ethereum", category: "Crypto", region: "24/7 · NY / Asia", flag: "Ξ" },
};

const CATEGORIES: (Category | "All")[] = ["All", "Metals", "Forex", "JPY", "Indices", "Crypto"];

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
  const [now, setNow] = useState<Date>(() => new Date());
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
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  // Detect timezone from user IP (free, no key). Falls back to browser TZ on error.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("https://ipapi.co/json/", { cache: "no-store" });
        if (!res.ok) return;
        const j = (await res.json()) as { timezone?: string; city?: string; country_name?: string };
        if (cancelled) return;
        if (j.timezone) setIpTZ(j.timezone);
        if (j.city || j.country_name)
          setIpCity([j.city, j.country_name].filter(Boolean).join(", "));
      } catch {
        // ignore; browser TZ fallback stays in effect
      }
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
      Metals: [],
      Forex: [],
      JPY: [],
      Indices: [],
      Crypto: [],
    };
    rows.forEach(r => g[r.meta.category].push(r));
    return g;
  }, [rows]);

  const utcNow = now.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZone: "UTC",
  });
  const localNow = now.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZone: tz,
  });

  return (
    <div className="min-h-dvh w-full bg-[#F8FAFC] text-slate-900 font-['Inter',system-ui,sans-serif] antialiased">
      <header className="sticky top-0 z-40 border-b border-zinc-100 bg-white/85 backdrop-blur-md">
        <div className="relative mx-auto flex max-w-[1600px] items-center justify-between gap-3 px-5 py-3 sm:px-6 sm:py-4">
          <button
            onClick={() => navigate({ to: "/app" })}
            className="h-8 inline-flex items-center gap-1.5 px-3 rounded-lg border border-zinc-200 bg-white text-[12px] text-zinc-700 hover:bg-zinc-50 transition"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back
          </button>
          <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-2.5">
            <Link
              to="/"
              aria-label="Jenvu home"
              className="pointer-events-auto shrink-0 inline-flex items-center justify-center rounded-md hover:opacity-80 transition"
            >
              <img src="/favicon.png" alt="JENVU AI" className="h-5 w-5 rounded-md object-contain" />
            </Link>
            <span className="font-semibold tracking-tight text-sm select-none">JENVU AI</span>
          </div>
          <Link
            to="/signal"
            className="h-8 inline-flex items-center gap-1.5 px-3 rounded-lg bg-zinc-900 text-[12px] font-medium text-white hover:bg-zinc-800 transition"
          >
            <Zap className="h-3.5 w-3.5" /> Signal Desk
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-[1600px] px-5 py-6 sm:px-6 sm:py-10">
        {/* Hero */}
        <div className="mb-6 sm:mb-8">
          <div className={`${MONO} text-[10px] tracking-[0.2em] uppercase text-zinc-500 mb-2`}>
            // Killzone Reference
          </div>
          <h1 className="text-2xl sm:text-4xl font-semibold tracking-tight">
            Every pair. Every killzone. Live.
          </h1>
          <p className="text-sm sm:text-[15px] text-zinc-600 mt-2 max-w-2xl">
            ICT / SMC session windows for every instrument Jenvu analyzes — shown in UTC and your
            local time, with a live IN/OUT status.
          </p>
        </div>

        {/* Live clock strip */}
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-zinc-200 bg-white p-4">
            <div className={`${MONO} text-[10px] uppercase tracking-widest text-zinc-500`}>UTC</div>
            <div className={`${MONO} text-xl sm:text-2xl font-semibold mt-1`}>{utcNow}</div>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-white p-4">
            <div className={`${MONO} text-[10px] uppercase tracking-widest text-zinc-500`}>
              Local · {tzShort}
            </div>
            <div className={`${MONO} text-xl sm:text-2xl font-semibold mt-1`}>{localNow}</div>
          </div>
          <div className="col-span-2 sm:col-span-1 rounded-xl border border-zinc-200 bg-white p-4">
            <div className={`${MONO} text-[10px] uppercase tracking-widest text-zinc-500`}>
              {ipCity ? "Detected location" : "Timezone"}
            </div>
            <div className="text-sm font-medium mt-1 flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-zinc-400" />
              <span className="truncate">{ipCity ?? tz}</span>
            </div>
            <div className={`${MONO} mt-1 text-[10px] text-zinc-500 truncate`}>
              {tz}
              {ipTZ ? " · via IP" : ""}
            </div>
          </div>
        </div>

        {/* Search + tabs */}
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search symbol, name or region…"
              className="w-full h-10 rounded-lg border border-zinc-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-zinc-400 transition"
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {CATEGORIES.map(c => (
              <button
                key={c}
                onClick={() => setCat(c)}
                className={`h-8 px-3 rounded-lg border text-[12px] font-medium transition ${
                  cat === c
                    ? "border-zinc-900 bg-zinc-900 text-white"
                    : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
                }`}
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
                  <div className={`${MONO} text-[11px] uppercase tracking-[0.2em] text-zinc-500`}>
                    {section}
                  </div>
                  <div className="h-px flex-1 bg-zinc-200" />
                  <div className={`${MONO} text-[10px] text-zinc-400`}>{items.length}</div>
                </div>

                <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2">
                  {items.map(({ profile, meta }) => {
                    const st = statusFor(profile, now);
                    return (
                      <button
                        key={profile.key}
                        onClick={() =>
                          navigate({ to: "/signal", search: { symbol: profile.key } as never })
                        }
                        className="group text-left rounded-xl border border-zinc-200 bg-white p-4 hover:border-zinc-300 hover:shadow-sm transition"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-lg leading-none">{meta.flag}</span>
                              <span className={`${MONO} text-sm font-semibold`}>
                                {profile.key}
                              </span>
                              <span className="text-xs text-zinc-500 truncate">{meta.name}</span>
                            </div>
                            <div className="mt-1 flex items-center gap-1 text-[11px] text-zinc-500">
                              <MapPin className="h-3 w-3" />
                              {meta.region}
                            </div>
                          </div>
                          <div
                            className={`shrink-0 inline-flex items-center gap-1.5 px-2 py-1 rounded-md ${MONO} text-[10px] uppercase tracking-wider ${
                              st.inKillzone
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : "bg-zinc-50 text-zinc-600 border border-zinc-200"
                            }`}
                          >
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${
                                st.inKillzone ? "bg-emerald-500 animate-pulse" : "bg-zinc-400"
                              }`}
                            />
                            {st.inKillzone ? "In Killzone" : "Outside"}
                          </div>
                        </div>

                        <div className="mt-3 space-y-1.5">
                          {profile.killzones.map(kz => {
                            const active = inZone(kz, now.getUTCHours());
                            return (
                              <div
                                key={kz.name}
                                className={`flex items-center justify-between gap-2 rounded-md px-2.5 py-1.5 text-[11px] ${
                                  active
                                    ? "bg-emerald-50/60 border border-emerald-100"
                                    : "bg-zinc-50/70 border border-zinc-100"
                                }`}
                              >
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <Clock className="h-3 w-3 text-zinc-400 shrink-0" />
                                  <span className="text-zinc-700 truncate">{kz.name}</span>
                                </div>
                                <div className={`${MONO} text-[10.5px] text-zinc-600 text-right`}>
                                  <span>
                                    {fmtUTC(kz.startUTC)}–{fmtUTC(kz.endUTC)} UTC
                                  </span>
                                  <span className="mx-1 text-zinc-300">·</span>
                                  <span className="text-zinc-500">
                                    {utcHourToLocal(kz.startUTC, tz)}–{utcHourToLocal(kz.endUTC, tz)}{" "}
                                    {tzShort}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        <div className="mt-3 flex items-center justify-between">
                          <div className={`${MONO} text-[10.5px] text-zinc-500`}>
                            Prime: {profile.primeSession.name} ·{" "}
                            {fmtUTC(profile.primeSession.startUTC)}–
                            {fmtUTC(profile.primeSession.endUTC)} UTC
                          </div>
                          <div
                            className={`${MONO} text-[10.5px] ${
                              st.inKillzone ? "text-emerald-700" : "text-zinc-500"
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
            <div className="rounded-xl border border-dashed border-zinc-200 bg-white p-10 text-center text-sm text-zinc-500">
              No instruments match your search.
            </div>
          )}
        </div>

        <p className="mt-10 text-center text-[11px] text-zinc-500">
          Local times auto-converted from UTC using your device timezone. Trade during killzones for
          highest A+ setup probability.
        </p>
      </main>
    </div>
  );
}
