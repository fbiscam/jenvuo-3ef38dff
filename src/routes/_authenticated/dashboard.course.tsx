import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Circle, ChevronLeft, ChevronRight, PlayCircle, Award } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/dashboard/course")({
  head: () => ({
    meta: [
      { title: "SMC A to Z Course — Jenvu" },
      { name: "description", content: "Learn Smart Money Concepts step by step: fractals, BOS, CHoCH, order blocks, liquidity, bias and ICT killzones." },
      { property: "og:title", content: "SMC A to Z Course — Jenvu" },
      { property: "og:description", content: "Phase-wise Smart Money Concepts video course inside your Jenvu dashboard." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CoursePage,
});

type Lesson = { id: string; title: string; about: string };
type Phase = { title: string; goal: string; lessons: Lesson[] };

const PLAYLIST = "PLSMuynR0LDMxnMMrNq-239BQwyESPX0gK";

const PHASES: Phase[] = [
  {
    title: "Phase 1 — Foundations",
    goal: "Understand what Smart Money is and how swings form.",
    lessons: [
      { id: "jwjjWHzEaJc", title: "True Smart Money Concept", about: "What SMC is, how institutions move price, and the mindset behind it." },
      { id: "4_33Wsc9fcg", title: "What Is a Fractal?", about: "Identify valid swing highs and lows — the building block of structure." },
    ],
  },
  {
    title: "Phase 2 — Market Structure",
    goal: "Read trend, breaks and internal structure correctly.",
    lessons: [
      { id: "46wLDbl2_d0", title: "BOS, CHoCH & Inducement", about: "Break of structure, change of character and inducement traps." },
      { id: "omZpI1DbYRI", title: "ITH / ITL / STH / STL", about: "Intermediate and short-term highs and lows for precise structure." },
    ],
  },
  {
    title: "Phase 3 — Zones & Liquidity",
    goal: "Find where smart money enters and what it targets.",
    lessons: [
      { id: "qEMhYlT6gwk", title: "Order Block, FVG & Order Flow", about: "Mark valid order blocks, fair value gaps and follow order flow." },
      { id: "zCj2SWbpmOk", title: "What Is Liquidity?", about: "Buy-side and sell-side liquidity, sweeps and targets." },
      { id: "A1LOTQ0R8ww", title: "What Is POI?", about: "Choose high-probability points of interest." },
      { id: "ZGRXswei3kI", title: "All Block Types", about: "Breaker, reclaimed, mitigation and other block types." },
    ],
  },
  {
    title: "Phase 4 — ICT Execution",
    goal: "Combine bias, timing and structure into a trade plan.",
    lessons: [
      { id: "4vRHblHQWvA", title: "What Is Bias?", about: "Build daily and higher-timeframe directional bias." },
      { id: "CK5jXz_io38", title: "Killzones, OTE, CBDR & Narrative", about: "Timing with killzones, optimal trade entry and the 3B narrative." },
      { id: "0zmD8iYhvpc", title: "Fractal + Bias + Structure + Liquidity", about: "Putting everything together into the full ICT model." },
    ],
  },
];

const ALL = PHASES.flatMap((p, pi) => p.lessons.map((l) => ({ ...l, phase: pi })));
const KEY = "jenvu-course-smc-progress";

function CoursePage() {
  const [current, setCurrent] = useState(0);
  const [done, setDone] = useState<string[]>([]);

  useEffect(() => {
    try {
      const s = JSON.parse(localStorage.getItem(KEY) || "{}");
      if (Array.isArray(s.done)) setDone(s.done);
      if (typeof s.current === "number" && s.current < ALL.length) setCurrent(s.current);
    } catch {}
  }, []);

  const save = (d: string[], c: number) => {
    setDone(d);
    setCurrent(c);
    localStorage.setItem(KEY, JSON.stringify({ done: d, current: c }));
  };

  const lesson = ALL[current];
  const pct = Math.round((done.length / ALL.length) * 100);
  const isDone = done.includes(lesson.id);

  const toggleDone = () => {
    const d = isDone ? done.filter((x) => x !== lesson.id) : [...done, lesson.id];
    save(d, !isDone && current < ALL.length - 1 ? current + 1 : current);
  };

  const phaseProgress = useMemo(
    () => PHASES.map((p) => p.lessons.filter((l) => done.includes(l.id)).length),
    [done],
  );

  const phase = PHASES[lesson.phase];

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 md:px-8 md:py-8">
      {/* Header */}
      <section className="mb-8 grid gap-6 border-b border-border pb-8 md:grid-cols-[minmax(0,1fr)_280px] md:items-end">
        <div className="min-w-0">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/60 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" /> Jenvu Academy
          </span>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-foreground md:text-4xl">SMC A to Z</h1>
          <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-muted-foreground">
            Smart Money Concepts from zero to a complete ICT trade model. Learn step by step, phase by phase.
          </p>
          <div className="mt-5 flex flex-wrap gap-2 text-xs">
            {[`${PHASES.length} phases`, `${ALL.length} lessons`, "Hindi / Urdu", "Beginner → Advanced"].map((t) => (
              <span key={t} className="rounded-md border border-border bg-card px-2.5 py-1 font-medium text-foreground">{t}</span>
            ))}
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-baseline justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Progress</span>
            <span className="text-2xl font-semibold tabular-nums text-foreground">{pct}%</span>
          </div>
          <Progress value={pct} className="mt-3 h-2" />
          <p className="mt-2 text-xs text-muted-foreground">
            {pct === 100 ? (
              <span className="inline-flex items-center gap-1 font-medium text-primary"><Award className="h-3.5 w-3.5" /> Course completed</span>
            ) : (
              `${done.length} of ${ALL.length} lessons completed`
            )}
          </p>
        </div>
      </section>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0">
          <div className="aspect-video w-full overflow-hidden rounded-xl border border-border bg-muted shadow-sm">
            <iframe
              key={lesson.id}
              className="h-full w-full"
              src={`https://www.youtube-nocookie.com/embed/${lesson.id}?list=${PLAYLIST}&rel=0&modestbranding=1`}
              title={lesson.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>

          <div className="mt-6">
            <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-muted-foreground">
              <span className="text-primary">{phase.title.split(" — ")[0]}</span>
              <span>·</span>
              <span>{phase.title.split(" — ")[1]}</span>
              <span>·</span>
              <span>Lesson {current + 1} of {ALL.length}</span>
            </div>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">{lesson.title}</h2>
            <p className="mt-2 max-w-3xl text-[15px] leading-relaxed text-muted-foreground">{lesson.about}</p>

            <div className="mt-6 grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 border-t border-border pt-5">
              <Button variant="outline" disabled={current === 0} onClick={() => save(done, current - 1)}>
                <ChevronLeft className="h-4 w-4" /> <span className="hidden sm:inline">Previous</span>
              </Button>
              <div className="flex justify-center">
                <Button variant={isDone ? "secondary" : "default"} onClick={toggleDone} className="min-w-[180px]">
                  <CheckCircle2 className="h-4 w-4" /> {isDone ? "Completed" : "Mark as complete"}
                </Button>
              </div>
              <Button variant="outline" disabled={current === ALL.length - 1} onClick={() => save(done, current + 1)}>
                <span className="hidden sm:inline">Next</span> <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        <aside className="h-fit overflow-hidden rounded-xl border border-border bg-card lg:sticky lg:top-4">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <h3 className="text-sm font-semibold text-foreground">Course content</h3>
            <span className="text-xs tabular-nums text-muted-foreground">{done.length}/{ALL.length}</span>
          </div>
          <div className="max-h-[72vh] overflow-y-auto">
            {PHASES.map((p, pi) => {
              const [num, name] = p.title.split(" — ");
              return (
                <div key={p.title} className="border-b border-border last:border-0">
                  <div className="px-5 pb-2 pt-4">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-primary">{num}</p>
                      <span className="text-[11px] tabular-nums text-muted-foreground">{phaseProgress[pi]}/{p.lessons.length}</span>
                    </div>
                    <p className="mt-1 text-sm font-semibold text-foreground">{name}</p>
                    <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{p.goal}</p>
                  </div>
                  <div className="pb-2">
                    {p.lessons.map((l) => {
                      const idx = ALL.findIndex((a) => a.id === l.id);
                      const active = idx === current;
                      const d = done.includes(l.id);
                      return (
                        <button
                          key={l.id}
                          onClick={() => save(done, idx)}
                          className={cn(
                            "grid w-full grid-cols-[20px_minmax(0,1fr)] items-start gap-3 border-l-2 border-transparent px-5 py-2.5 text-left transition-colors hover:bg-muted/60",
                            active && "border-primary bg-muted/70",
                          )}
                        >
                          {d ? (
                            <CheckCircle2 className="mt-0.5 h-4 w-4 text-primary" />
                          ) : active ? (
                            <PlayCircle className="mt-0.5 h-4 w-4 text-foreground" />
                          ) : (
                            <Circle className="mt-0.5 h-4 w-4 text-muted-foreground/60" />
                          )}
                          <span className={cn("text-sm leading-snug", active ? "font-medium text-foreground" : "text-muted-foreground")}>
                            <span className="mr-1.5 tabular-nums">{String(idx + 1).padStart(2, "0")}</span>
                            {l.title}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </aside>
      </div>
    </div>
  );
}
