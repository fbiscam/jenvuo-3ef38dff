import * as React from "react";

const MONO = "font-['JetBrains_Mono',ui-monospace,monospace]";

type Session = {
  key: string;
  name: string;
  meta: string; // right-side descriptor (e.g. "High Expansion")
  metaLabel: string; // small uppercase label before meta (e.g. "Vol")
  startH: number;
  endH: number;
  color: string; // hex
  tw: {
    bar: string;
    ring: string;
    hoverBorder: string;
    accentText: string;
    activeBadge: string;
    barShadow: string;
  };
};

const SESSIONS: Session[] = [
  {
    key: "asia",
    name: "Asia",
    metaLabel: "Range",
    meta: "Liquidity build",
    startH: 0,
    endH: 6,
    color: "#3b82f6",
    tw: {
      bar: "bg-blue-500",
      ring: "ring-blue-500/20",
      hoverBorder: "hover:border-blue-500/30",
      accentText: "text-blue-400",
      activeBadge: "text-blue-400",
      barShadow: "shadow-[0_0_10px_rgba(59,130,246,0.5)]",
    },
  },
  {
    key: "lokz",
    name: "London",
    metaLabel: "Vol",
    meta: "Judas + Sweep",
    startH: 7,
    endH: 10,
    color: "#22c55e",
    tw: {
      bar: "bg-green-500",
      ring: "ring-green-500/20",
      hoverBorder: "hover:border-green-500/30",
      accentText: "text-green-400",
      activeBadge: "text-green-400",
      barShadow: "shadow-[0_0_10px_rgba(34,197,94,0.5)]",
    },
  },
  {
    key: "nyam",
    name: "NY AM",
    metaLabel: "Bias",
    meta: "Displacement",
    startH: 12,
    endH: 15,
    color: "#f59e0b",
    tw: {
      bar: "bg-amber-500",
      ring: "ring-amber-500/20",
      hoverBorder: "hover:border-amber-500/30",
      accentText: "text-amber-400",
      activeBadge: "text-amber-400",
      barShadow: "shadow-[0_0_10px_rgba(245,158,11,0.5)]",
    },
  },
  {
    key: "nypm",
    name: "NY PM",
    metaLabel: "Proj",
    meta: "Reversal Sweep",
    startH: 17,
    endH: 20,
    color: "#ef4444",
    tw: {
      bar: "bg-red-500",
      ring: "ring-red-500/20",
      hoverBorder: "hover:border-red-500/30",
      accentText: "text-red-400",
      activeBadge: "text-red-400",
      barShadow: "shadow-[0_0_10px_rgba(239,68,68,0.5)]",
    },
  },
];

function useUtc(): Date {
  const [d, setD] = React.useState(() => new Date());
  React.useEffect(() => {
    const id = setInterval(() => setD(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return d;
}

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function hourToXY(h: number, r: number, cx: number, cy: number) {
  const angle = (h / 24) * Math.PI * 2 - Math.PI / 2;
  return { x: cx + Math.cos(angle) * r, y: cy + Math.sin(angle) * r };
}

function arcPath(startH: number, endH: number, r: number, cx: number, cy: number) {
  const a = hourToXY(startH, r, cx, cy);
  const b = hourToXY(endH, r, cx, cy);
  const large = (endH - startH) % 24 > 12 ? 1 : 0;
  return `M ${a.x} ${a.y} A ${r} ${r} 0 ${large} 1 ${b.x} ${b.y}`;
}

function isActive(now: Date, s: Session): boolean {
  const h = now.getUTCHours() + now.getUTCMinutes() / 60;
  return h >= s.startH && h < s.endH;
}

function statusLabel(now: Date, s: Session) {
  const hh = now.getUTCHours() + now.getUTCMinutes() / 60;
  if (hh >= s.startH && hh < s.endH) {
    const mins = Math.round((s.endH - hh) * 60);
    return { text: "Live Now", closesIn: `${Math.floor(mins / 60)}h ${mins % 60}m`, active: true };
  }
  let diff = s.startH - hh;
  if (diff < 0) diff += 24;
  const mins = Math.round(diff * 60);
  return { text: "Upcoming", closesIn: `${Math.floor(mins / 60)}h ${mins % 60}m`, active: false };
}

export function KillzoneClockSection() {
  const now = useUtc();
  const h =
    now.getUTCHours() + now.getUTCMinutes() / 60 + now.getUTCSeconds() / 3600;
  const needleAngle = (h / 24) * 360;

  return (
    <section className="bg-black">
      <div className="mx-auto max-w-6xl px-5 py-14 sm:px-6 sm:py-20">
        <style>{`
          @keyframes kzPulse { 0%,100% { opacity: 0.5; } 50% { opacity: 1; } }
          @keyframes kzSpinSlow { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
          .kz-outer-spin { animation: kzSpinSlow 240s linear infinite; transform-origin: center; }
        `}</style>

        <div className="mb-14 max-w-2xl">
          <div className={`${MONO} text-[10px] uppercase tracking-[0.3em] text-white/40 mb-3`}>
            24H Session Chronograph
          </div>
          <h2 className="text-2xl font-light tracking-tight sm:text-4xl md:text-[42px] text-white leading-[1.05]">
            The killzone clock <span className="text-white/50">JENVU trades to.</span>
          </h2>
          <p className="mt-4 text-sm text-white/40 leading-relaxed max-w-md">
            Every A+ setup is anchored to a killzone. The same 24-hour window the desk scans in real time.
          </p>
        </div>

        <div className="flex flex-col md:flex-row items-center gap-14 md:gap-20">
          {/* LEFT: Precision Dial */}
          <div className="relative flex-shrink-0">
            {/* Outer technical ring */}
            <div className="absolute -inset-8 rounded-full border border-white/5 ring-1 ring-white/5 ring-inset" />

            <div
              className="relative w-80 h-80 md:w-96 md:h-96 rounded-full flex items-center justify-center"
              style={{ boxShadow: "0 0 100px rgba(255,255,255,0.03)" }}
            >
              {/* Dial SVG */}
              <div className="absolute inset-0">
                <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                  {/* Sub-minute hairline ticks */}
                  <circle
                    cx="50"
                    cy="50"
                    r="48"
                    fill="none"
                    stroke="rgba(255,255,255,0.08)"
                    strokeWidth="0.5"
                    strokeDasharray="0.1 1.95"
                  />
                  {/* Slow-rotating decorative dashed ring */}
                  <g className="kz-outer-spin" style={{ transformOrigin: "50px 50px" }}>
                    <circle
                      cx="50"
                      cy="50"
                      r="46"
                      fill="none"
                      stroke="rgba(255,255,255,0.06)"
                      strokeWidth="0.3"
                      strokeDasharray="1 3"
                    />
                  </g>

                  {/* Session arcs — real UTC positions */}
                  {SESSIONS.map((s, i) => {
                    const active = isActive(now, s);
                    // Stagger radii slightly so arcs read as concentric rings
                    const r = [42, 43.5, 45, 45][i] ?? 44;
                    return (
                      <path
                        key={s.key}
                        d={arcPath(s.startH, s.endH, r, 50, 50)}
                        fill="none"
                        stroke={s.color}
                        strokeWidth={active ? 2.2 : 1.5}
                        strokeLinecap="round"
                        opacity={active ? 0.95 : 0.4}
                        style={active ? { filter: `drop-shadow(0 0 3px ${s.color})` } : undefined}
                      />
                    );
                  })}
                </svg>
              </div>

              {/* Hour labels (00/06/12/18) */}
              <div className="absolute inset-0">
                <span className={`absolute top-2 left-1/2 -translate-x-1/2 text-[10px] font-medium text-white/40 ${MONO}`}>
                  00
                </span>
                <span className={`absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-medium text-white/40 ${MONO}`}>
                  06
                </span>
                <span className={`absolute bottom-2 left-1/2 -translate-x-1/2 text-[10px] font-medium text-white/40 ${MONO}`}>
                  12
                </span>
                <span className={`absolute left-2 top-1/2 -translate-y-1/2 text-[10px] font-medium text-white/40 ${MONO}`}>
                  18
                </span>
              </div>

              {/* Center readout */}
              <div className="relative flex flex-col items-center">
                <div className={`text-[10px] tracking-[0.3em] text-white/30 ${MONO} mb-1 uppercase`}>
                  Global UTC
                </div>
                <div className={`text-5xl md:text-6xl font-light tracking-tighter text-white ${MONO} tabular-nums`}>
                  {pad2(now.getUTCHours())}:{pad2(now.getUTCMinutes())}
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <span
                    className="w-1.5 h-1.5 rounded-full bg-green-500"
                    style={{ animation: "kzPulse 2s ease-in-out infinite" }}
                  />
                  <span className="text-[10px] font-medium text-white/60 tracking-widest uppercase">
                    Live Feed
                  </span>
                </div>
              </div>

              {/* Needle */}
              <div
                className="absolute inset-0 pointer-events-none transition-transform duration-1000 ease-linear"
                style={{ transform: `rotate(${needleAngle}deg)` }}
              >
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-1/2 bg-gradient-to-t from-transparent via-white/50 to-white" />
                <div
                  className="absolute top-[-4px] left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-white rounded-full"
                  style={{ boxShadow: "0 0 10px rgba(255,255,255,0.9)" }}
                />
              </div>
            </div>
          </div>

          {/* RIGHT: Session cards */}
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
            {SESSIONS.map((s) => {
              const st = statusLabel(now, s);
              const active = st.active;
              return (
                <div
                  key={s.key}
                  className={`group relative p-6 transition-all border ${
                    active
                      ? `bg-white/[0.04] border-white/10 ring-1 ${s.tw.ring}`
                      : `bg-white/[0.02] border-white/5 hover:bg-white/[0.05] ${s.tw.hoverBorder}`
                  }`}
                >
                  <div className="absolute top-0 right-0 p-3">
                    <span
                      className={`text-[9px] ${MONO} uppercase tracking-tighter ${
                        active ? `${s.tw.activeBadge}` : "text-white/20"
                      }`}
                      style={active ? { animation: "kzPulse 2s ease-in-out infinite" } : undefined}
                    >
                      {active ? "Live Now" : "Upcoming"}
                    </span>
                  </div>

                  <div
                    className={`h-1 w-8 ${s.tw.bar} mb-6 ${
                      active ? s.tw.barShadow : "opacity-40"
                    }`}
                  />

                  <h3 className="text-white text-lg font-light tracking-tight mb-1">
                    {s.name}
                  </h3>
                  <p className={`text-white/40 text-xs ${MONO}`}>
                    {pad2(s.startH)}:00 — {pad2(s.endH)}:00 UTC
                  </p>

                  <div className="mt-4 flex items-baseline gap-1.5">
                    <span
                      className={`text-[10px] uppercase ${
                        active ? `${s.tw.accentText} opacity-60` : "text-white/20"
                      }`}
                    >
                      {active ? "Closes in" : s.metaLabel}:
                    </span>
                    <span
                      className={`text-xs ${MONO} ${
                        active ? s.tw.accentText : "text-white/60"
                      }`}
                    >
                      {active ? st.closesIn : s.meta}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
