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
      { id: "jwjjWHzEaJc", title: "  True smart money concept", about: "What SMC is, how institutions move price, and the mindset behind it." },
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

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 md:px-8">
      <div className="mb-6 flex flex-col gap-4 rounded-2xl border border-border bg-card p-6 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{"\n"}</p>
          <h1 className="mt-1 text-2xl font-semibold text-foreground md:text-3xl">Smc a to z</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Smart Money Concepts from zero to a complete ICT trade model — 4 phases, {ALL.length} lessons, in Hindi/Urdu.
          </p>
        </div>
        <div className="w-full md:w-64">
          <div className="mb-2 flex justify-between text-sm">
            <span className="text-muted-foreground">Your progress</span>
            <span className="font-medium text-foreground">{done.length}/{ALL.length} · {pct}%</span>
          </div>
          <Progress value={pct} />
          {pct === 100 && (
            <p className="mt-2 flex items-center gap-1 text-sm font-medium text-primary">
              <Award className="h-4 w-4" /> Course completed
            </p>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="min-w-0">
          <div className="aspect-video w-full overflow-hidden rounded-2xl border border-border bg-muted">
            <iframe
              key={lesson.id}
              className="h-full w-full"
              src={`https://www.youtube-nocookie.com/embed/${lesson.id}?list=${PLAYLIST}&rel=0&modestbranding=1`}
              title={lesson.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
          <div className="mt-4 rounded-2xl border border-border bg-card p-5">
            <p className="text-xs font-medium text-muted-foreground">
              {PHASES[lesson.phase].title} · Lesson {current + 1} of {ALL.length}
            </p>
            <h2 className="mt-1 text-xl font-semibold text-foreground">{lesson.title}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{lesson.about}</p>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Button variant="outline" size="sm" disabled={current === 0} onClick={() => save(done, current - 1)}>
                <ChevronLeft className="h-4 w-4" /> Previous
              </Button>
              <Button size="sm" variant={isDone ? "secondary" : "default"} onClick={toggleDone}>
                <CheckCircle2 className="h-4 w-4" /> {isDone ? "Completed" : "Mark as complete"}
              </Button>
              <Button variant="outline" size="sm" disabled={current === ALL.length - 1} onClick={() => save(done, current + 1)}>
                Next <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        <aside className="h-fit rounded-2xl border border-border bg-card lg:sticky lg:top-4">
          <div className="border-b border-border p-4">
            <h3 className="font-semibold text-foreground">{"\u00a0Course content"}</h3>
            <p className="text-xs text-muted-foreground">{PHASES.length} phases · {ALL.length} lessons</p>
          </div>
          <div className="max-h-[70vh] overflow-y-auto">
            {PHASES.map((p, pi) => (
              <div key={p.title} className="border-b border-border last:border-0">
                <div className="bg-muted/50 px-4 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-foreground">{p.title}</p>
                    <span className="text-xs text-muted-foreground">{phaseProgress[pi]}/{p.lessons.length}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{p.goal}</p>
                </div>
                {p.lessons.map((l) => {
                  const idx = ALL.findIndex((a) => a.id === l.id);
                  const active = idx === current;
                  const d = done.includes(l.id);
                  return (
                    <button
                      key={l.id}
                      onClick={() => save(done, idx)}
                      className={cn(
                        "flex w-full items-start gap-3 px-4 py-3 text-left text-sm transition-colors hover:bg-muted",
                        active && "bg-accent",
                      )}
                    >
                      {d ? (
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      ) : active ? (
                        <PlayCircle className="mt-0.5 h-4 w-4 shrink-0 text-foreground" />
                      ) : (
                        <Circle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                      )}
                      <span className="flex-1">
                        <span className="block text-foreground">{idx + 1}. {l.title}</span>
                        <img
                          src={`https://i.ytimg.com/vi/${l.id}/mqdefault.jpg`}
                          alt=""
                          loading="lazy"
                          className={cn("mt-2 w-28 rounded-md border border-border", !active && "hidden")}
                        />
                      </span>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}
