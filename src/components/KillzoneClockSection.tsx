import * as React from "react";

const MONO = "font-['JetBrains_Mono',ui-monospace,monospace]";

type Session = {
  key: string;
  name: string;
  desc: string;
  startH: number; // UTC hour (fractional allowed)
  endH: number;
  color: string;
  soft: string;
};

// Sessions in UTC. Ordered for card display.
const SESSIONS: Session[] = [
  { key: "asia", name: "Asia · Tokyo", desc: "Range build, liquidity engineering", startH: 0, endH: 6, color: "#38bdf8", soft: "rgba(56,189,248,0.15)" },
  { key: "lokz", name: "London Killzone", desc: "07:00–10:00 UTC · judas + sweep", startH: 7, endH: 10, color: "#10b981", soft: "rgba(16,185,129,0.18)" },
  { key: "nyam", name: "NY AM Killzone", desc: "12:00–15:00 UTC · displacement", startH: 12, endH: 15, color: "#f59e0b", soft: "rgba(245,158,11,0.18)" },
  { key: "nypm", name: "NY PM · Silver Bullet", desc: "17:00–20:00 UTC · reversal window", startH: 17, endH: 20, color: "#f43f5e", soft: "rgba(244,63,94,0.18)" },
];

function useUtc(): Date {
  const [d, setD] = React.useState(() => new Date());
  React.useEffect(() => {
    const id = setInterval(() => setD(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return d;
}

// Convert an hour (0..24) to a point on a circle. 0 = top, clockwise.
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

function pad2(n: number) { return String(n).padStart(2, "0"); }

function statusFor(now: Date, s: Session): "active" | "next" | "closed" {
  const h = now.getUTCHours() + now.getUTCMinutes() / 60;
  if (h >= s.startH && h < s.endH) return "active";
  return "next";
}

export function KillzoneClockSection() {
  const now = useUtc();
  const h = now.getUTCHours() + now.getUTCMinutes() / 60 + now.getUTCSeconds() / 3600;
  const pointer = hourToXY(h, 132, 160, 160);
  const activeSession = SESSIONS.find((s) => statusFor(now, s) === "active");

  // Compute time-to-next for each session
  const nextInfo = (s: Session) => {
    const hh = now.getUTCHours() + now.getUTCMinutes() / 60;
    if (hh >= s.startH && hh < s.endH) {
      const mins = Math.round((s.endH - hh) * 60);
      return { label: "Closes in", value: `${Math.floor(mins / 60)}h ${mins % 60}m` };
    }
    let diff = s.startH - hh;
    if (diff < 0) diff += 24;
    const mins = Math.round(diff * 60);
    return { label: "Opens in", value: `${Math.floor(mins / 60)}h ${mins % 60}m` };
  };

  return (
    <section className="bg-black">
      <div className="mx-auto max-w-6xl px-5 py-10 sm:px-6 sm:py-14">
        <style>{`
          @keyframes kzSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
          @keyframes kzGlow { 0%,100% { opacity: 0.4; } 50% { opacity: 1; } }
          @keyframes kzPulseRing { 0% { transform: scale(1); opacity: 0.6; } 100% { transform: scale(1.8); opacity: 0; } }
          .kz-spin-slow { animation: kzSpin 120s linear infinite; transform-origin: center; }
          .kz-glow { animation: kzGlow 2.4s ease-in-out infinite; }
          .kz-ring { transform-origin: center; animation: kzPulseRing 2.2s ease-out infinite; transform-box: fill-box; }
        `}</style>

        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3 mb-10">
          <div>
            <div className={`${MONO} text-[10px] uppercase tracking-[0.25em] text-emerald-500 mb-2`}>Session Intelligence · UTC</div>
            <h2 className="text-xl font-semibold tracking-tight sm:text-3xl md:text-4xl text-white">
              The killzone clock JENVU trades to.
            </h2>
          </div>
          <p className="max-w-md text-sm text-zinc-400 leading-relaxed">
            Every A+ setup is anchored to a killzone. This is the same 24-hour window the desk scans in real time.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          {/* CLOCK */}
          <div className="relative rounded-2xl border border-zinc-800 bg-[#050505] p-6 overflow-hidden">
            {/* Ambient */}
            <div className="pointer-events-none absolute inset-0 opacity-40" style={{
              background: "radial-gradient(circle at 50% 50%, rgba(16,185,129,0.08), transparent 60%)"
            }} />

            <div className="relative mx-auto" style={{ width: 320, height: 320, maxWidth: "100%" }}>
              <svg viewBox="0 0 320 320" className="w-full h-full">
                <defs>
                  <radialGradient id="kz-core" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
                    <stop offset="70%" stopColor="#10b981" stopOpacity="0" />
                  </radialGradient>
                </defs>

                {/* Outer faint ring */}
                <circle cx="160" cy="160" r="140" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
                {/* Session arcs */}
                {SESSIONS.map((s) => {
                  const active = statusFor(now, s) === "active";
                  return (
                    <path
                      key={s.key}
                      d={arcPath(s.startH, s.endH, 132, 160, 160)}
                      stroke={s.color}
                      strokeWidth={active ? 10 : 7}
                      strokeLinecap="round"
                      fill="none"
                      opacity={active ? 1 : 0.55}
                      style={active ? { filter: `drop-shadow(0 0 10px ${s.color})` } : undefined}
                    />
                  );
                })}

                {/* Hour ticks */}
                {Array.from({ length: 24 }).map((_, i) => {
                  const outer = hourToXY(i, 148, 160, 160);
                  const inner = hourToXY(i, i % 6 === 0 ? 138 : 143, 160, 160);
                  return (
                    <line
                      key={i}
                      x1={inner.x} y1={inner.y} x2={outer.x} y2={outer.y}
                      stroke={i % 6 === 0 ? "rgba(255,255,255,0.35)" : "rgba(255,255,255,0.12)"}
                      strokeWidth="1"
                    />
                  );
                })}

                {/* Hour labels at 0/6/12/18 */}
                {[0, 6, 12, 18].map((hh) => {
                  const p = hourToXY(hh, 160, 160, 160);
                  return (
                    <text
                      key={hh}
                      x={p.x} y={p.y}
                      textAnchor="middle" dominantBaseline="middle"
                      className={MONO}
                      fontSize="9"
                      fill="rgba(255,255,255,0.5)"
                    >
                      {pad2(hh)}
                    </text>
                  );
                })}

                {/* Slow rotating decorative ring */}
                <g className="kz-spin-slow" style={{ transformOrigin: "160px 160px" }}>
                  <circle cx="160" cy="160" r="118" fill="none" stroke="rgba(16,185,129,0.15)" strokeWidth="0.5" strokeDasharray="2 6" />
                </g>

                {/* Core glow */}
                <circle cx="160" cy="160" r="90" fill="url(#kz-core)" />

                {/* Pointer */}
                <line x1="160" y1="160" x2={pointer.x} y2={pointer.y}
                  stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round"
                  style={{ filter: "drop-shadow(0 0 4px rgba(255,255,255,0.7))" }}
                />
                <circle cx={pointer.x} cy={pointer.y} r="4" fill="#ffffff" />
                <circle cx={pointer.x} cy={pointer.y} r="4" fill="none" stroke="#ffffff" strokeWidth="1" className="kz-ring" />

                {/* Center hub */}
                <circle cx="160" cy="160" r="4" fill="#10b981" />
              </svg>

              {/* Center text overlay */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <div className={`${MONO} text-[9px] uppercase tracking-[0.3em] text-zinc-500 mb-1`}>UTC</div>
                <div className={`${MONO} text-3xl font-bold text-white tabular-nums tracking-tight`}>
                  {pad2(now.getUTCHours())}:{pad2(now.getUTCMinutes())}
                </div>
                <div className="mt-2 flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full kz-glow" style={{ backgroundColor: activeSession?.color ?? "#52525b" }} />
                  <span className={`${MONO} text-[9px] uppercase tracking-widest`} style={{ color: activeSession?.color ?? "#71717a" }}>
                    {activeSession ? activeSession.name : "Between Sessions"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* SESSION CARDS */}
          <div className="flex flex-col gap-3">
            {SESSIONS.map((s) => {
              const status = statusFor(now, s);
              const info = nextInfo(s);
              const active = status === "active";
              return (
                <div
                  key={s.key}
                  className="relative rounded-xl border p-4 overflow-hidden transition-colors"
                  style={{
                    borderColor: active ? s.color : "rgba(255,255,255,0.08)",
                    background: active ? s.soft : "#050505",
                  }}
                >
                  {active && (
                    <div className="absolute inset-x-0 bottom-0 h-px" style={{
                      background: `linear-gradient(90deg, transparent, ${s.color}, transparent)`
                    }} />
                  )}
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full" style={{
                          backgroundColor: s.color,
                          boxShadow: active ? `0 0 8px ${s.color}` : undefined,
                          animation: active ? "kzGlow 1.6s ease-in-out infinite" : undefined,
                        }} />
                        <span className="text-[13px] font-semibold text-white">{s.name}</span>
                      </div>
                      <div className={`${MONO} text-[10px] text-zinc-500 mt-1 uppercase tracking-wider`}>
                        {s.desc}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className={`${MONO} text-[9px] uppercase tracking-widest ${active ? "text-white/70" : "text-zinc-500"}`}>
                        {info.label}
                      </div>
                      <div className={`${MONO} text-[13px] font-bold tabular-nums`} style={{ color: active ? s.color : "#e4e4e7" }}>
                        {info.value}
                      </div>
                    </div>
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
