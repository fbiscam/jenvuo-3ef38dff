import * as React from "react";

type Session = {
  key: string;
  name: string;
  startH: number;
  endH: number;
  color: string;
  tw: {
    bar: string;
    ring: string;
    hoverBorder: string;
    accentText: string;
  };
};

const SESSIONS: Session[] = [
  {
    key: "asia",
    name: "Asia",
    startH: 0,
    endH: 6,
    color: "#3b82f6",
    tw: {
      bar: "bg-blue-500",
      ring: "ring-blue-500/30",
      hoverBorder: "hover:border-blue-500/40",
      accentText: "text-blue-400",
    },
  },
  {
    key: "lokz",
    name: "London",
    startH: 7,
    endH: 10,
    color: "#22c55e",
    tw: {
      bar: "bg-green-500",
      ring: "ring-green-500/30",
      hoverBorder: "hover:border-green-500/40",
      accentText: "text-green-400",
    },
  },
  {
    key: "nyam",
    name: "NY AM",
    startH: 12,
    endH: 15,
    color: "#f59e0b",
    tw: {
      bar: "bg-amber-500",
      ring: "ring-amber-500/30",
      hoverBorder: "hover:border-amber-500/40",
      accentText: "text-amber-400",
    },
  },
  {
    key: "nypm",
    name: "NY PM",
    startH: 17,
    endH: 20,
    color: "#ef4444",
    tw: {
      bar: "bg-red-500",
      ring: "ring-red-500/30",
      hoverBorder: "hover:border-red-500/40",
      accentText: "text-red-400",
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
        <div className="mb-10 max-w-2xl">
          <h2 className="text-2xl font-light tracking-tight sm:text-4xl md:text-[42px] text-white leading-[1.05]">
            The killzone clock <span className="text-white/50">JENVU trades to.</span>
          </h2>
          <p className="mt-4 text-sm text-white/50 leading-relaxed max-w-md">
            Every A+ setup is anchored to a killzone. The same 24-hour window the desk scans in real time.
          </p>
        </div>

        <div className="flex flex-col md:flex-row items-center gap-12 md:gap-16">
          {/* Clock */}
          <div className="relative w-72 h-72 md:w-80 md:h-80 flex-shrink-0 rounded-full flex items-center justify-center">
            <div className="absolute inset-0">
              <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                <circle cx="50" cy="50" r="46" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="0.5" />
                {SESSIONS.map((s) => {
                  const active = isActive(now, s);
                  return (
                    <path
                      key={s.key}
                      d={arcPath(s.startH, s.endH, 46, 50, 50)}
                      fill="none"
                      stroke={s.color}
                      strokeWidth={active ? 2.5 : 1.5}
                      strokeLinecap="round"
                      opacity={active ? 1 : 0.5}
                    />
                  );
                })}
              </svg>
            </div>

            {/* Hour labels */}
            <div className="absolute inset-0">
              <span className="absolute top-1 left-1/2 -translate-x-1/2 text-[10px] text-white/40">00</span>
              <span className="absolute right-1 top-1/2 -translate-y-1/2 text-[10px] text-white/40">06</span>
              <span className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[10px] text-white/40">12</span>
              <span className="absolute left-1 top-1/2 -translate-y-1/2 text-[10px] text-white/40">18</span>
            </div>

            {/* Center */}
            <div className="relative flex flex-col items-center">
              <div className="text-[10px] tracking-widest text-white/40 uppercase mb-1">UTC</div>
              <div className="text-4xl md:text-5xl font-light tracking-tight text-white tabular-nums">
                {pad2(now.getUTCHours())}:{pad2(now.getUTCMinutes())}
              </div>
            </div>

            {/* Needle */}
            <div
              className="absolute inset-0 pointer-events-none transition-transform duration-1000 ease-linear"
              style={{ transform: `rotate(${needleAngle}deg)` }}
            >
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-1/2 bg-gradient-to-t from-transparent to-white/70" />
              <div className="absolute top-[-3px] left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-white rounded-full" />
            </div>
          </div>

          {/* Cards */}
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
            {SESSIONS.map((s) => {
              const st = statusLabel(now, s);
              const active = st.active;
              return (
                <div
                  key={s.key}
                  className={`relative p-5 rounded-lg border transition-all ${
                    active
                      ? `bg-white/[0.04] border-white/10 ring-1 ${s.tw.ring}`
                      : `bg-white/[0.02] border-white/5 ${s.tw.hoverBorder}`
                  }`}
                >
                  <div className={`h-1 w-8 ${s.tw.bar} mb-4 ${active ? "" : "opacity-40"}`} />
                  <h3 className="text-white text-lg font-light tracking-tight mb-1">{s.name}</h3>
                  <p className="text-white/40 text-xs">
                    {pad2(s.startH)}:00 — {pad2(s.endH)}:00 UTC
                  </p>
                  <div className="mt-3 flex items-baseline gap-1.5">
                    <span className={`text-[10px] uppercase ${active ? s.tw.accentText : "text-white/30"}`}>
                      {active ? "Closes in:" : "Status:"}
                    </span>
                    <span className={`text-xs ${active ? s.tw.accentText : "text-white/60"}`}>
                      {active ? st.closesIn : "Upcoming"}
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
