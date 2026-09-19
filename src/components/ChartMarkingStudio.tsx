import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Eraser, SendHorizontal, RefreshCcw } from "lucide-react";

import SignalChart, { type SignalChartHandle } from "@/components/SignalChart";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getChartCandles, getSignalPlan, type Marking, type SignalPlan } from "@/lib/gold-analysis.functions";

type Tf = "htf" | "ltf";

const TF_LABEL: Record<Tf, string> = { htf: "4H", ltf: "15M" };

const QUICK_PROMPTS = [
  "Sab kuch mark karo",
  "Liquidity mark karo",
  "Order block mark karo",
  "FVG mark karo",
  "BOS / CHoCH mark karo",
  "Entry, SL aur TP mark karo",
  "Premium / discount mark karo",
];

function markingTf(text: string, fallback: Tf): Tf | "both" {
  const t = text.toLowerCase();
  if (/\b(4h|four hour|h4|htf)\b/.test(t)) return "htf";
  if (/\b(15m|m15|ltf|fifteen)\b/.test(t)) return "ltf";
  if (/\b(dono|both|sab timeframe|all timeframe)\b/.test(t)) return "both";
  return fallback;
}

function matches(m: Marking, text: string): boolean {
  const t = text.toLowerCase();
  if (!t.trim() || /\b(all|sab|sab kuch|everything|full|smc|ict)\b/.test(t)) return true;
  const type = m.type;
  const rules: Array<[RegExp, string[]]> = [
    [/\bliquidity|liq|bsl|ssl|sweep|pool\b/, ["liquidity"]],
    [/\bob\b|order ?block|supply|demand|zone/, ["orderBlock", "zone", "breaker"]],
    [/\bfvg\b|gap|imbalance/, ["fvg"]],
    [/\bbos\b|\bchoch\b|structure|break|reversal|trend/, ["bos", "choch"]],
    [/\beqh\b|\beql\b|equal (high|low)/, ["eqh", "eql"]],
    [/premium|discount|equilibrium|\bote\b/, ["premiumZone", "discountZone", "oteZone"]],
    [/entry|\bsl\b|stop|\btp\b|target|execution|trade|setup/, ["entry", "sl", "tp"]],
    [/support|resistance|level|key level/, ["liquidity", "eqh", "eql"]],
  ];
  const hit = rules.filter(([re]) => re.test(t)).flatMap(([, types]) => types);
  if (!hit.length) return true;
  return hit.includes(type);
}

export default function ChartMarkingStudio() {
  const runPlan = useServerFn(getSignalPlan);
  const runCandles = useServerFn(getChartCandles);

  const htfRef = useRef<SignalChartHandle>(null);
  const ltfRef = useRef<SignalChartHandle>(null);

  const [plan, setPlan] = useState<SignalPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tf, setTf] = useState<Tf>("htf");
  const [text, setText] = useState("");
  const [log, setLog] = useState<{ role: "you" | "jenvu"; body: string }[]>([]);
  const [drawn, setDrawn] = useState<Marking[]>([]);
  const [candleSet, setCandleSet] = useState<{
    htf: SignalPlan["htfCandles"];
    ltf: SignalPlan["ltfCandles"];
  }>({ htf: [], ltf: [] });

  const load = useCallback(
    async (force: boolean) => {
      setLoading(true);
      setError(null);
      try {
        const res = await runPlan({ data: { symbol: "XAUUSD", force } });
        if (!res.ok) {
          setError(res.error);
        } else {
          setPlan(res.plan);
          if (res.plan.htfCandles?.length && res.plan.ltfCandles?.length) {
            setCandleSet({ htf: res.plan.htfCandles, ltf: res.plan.ltfCandles });
          }
          setDrawn([]);
          htfRef.current?.clear();
          ltfRef.current?.clear();
        }
      } catch {
        setError("Chart data load nahi hui. Thori dair baad dobara koshish karein.");
      } finally {
        setLoading(false);
      }
    },
    [runPlan],
  );

  useEffect(() => {
    void load(false);
  }, [load]);

  // Load live candles straight away, then keep them fresh without re-running analysis.
  useEffect(() => {
    let alive = true;
    const pull = async () => {
      try {
        const res = await runCandles({ data: { symbol: "XAUUSD" } });
        if (!alive || !res.ok || !res.htfCandles.length) return;
        setCandleSet({ htf: res.htfCandles, ltf: res.ltfCandles });
      } catch {
        /* silent */
      }
    };
    void pull();
    const id = setInterval(() => void pull(), 30_000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [runCandles]);

  const markings = plan?.markings ?? [];

  const submit = useCallback(
    (raw: string) => {
      const request = raw.trim();
      if (!request || !plan) return;
      const target = markingTf(request, tf);
      const picked = markings.filter(
        (m) => (target === "both" || m.tf === target) && matches(m, request),
      );
      setLog((prev) => [...prev, { role: "you", body: request }]);
      if (!picked.length) {
        setLog((prev) => [
          ...prev,
          {
            role: "jenvu",
            body: `${target === "both" ? "Dono timeframes" : TF_LABEL[target as Tf]} par is request ki koi verified marking maujood nahi hai. Koi doosri cheez batayein ya chart refresh karein.`,
          },
        ]);
        setText("");
        return;
      }
      for (const m of picked) {
        (m.tf === "htf" ? htfRef : ltfRef).current?.drawMarking(m);
      }
      if (target !== "both") setTf(target as Tf);
      const first = picked.find((m) => m.tf === (target === "both" ? "htf" : target));
      if (first) (first.tf === "htf" ? htfRef : ltfRef).current?.focusMarking(first);
      setDrawn((prev) => [...prev, ...picked]);
      setLog((prev) => [
        ...prev,
        {
          role: "jenvu",
          body: `${picked.length} marking${picked.length > 1 ? "s" : ""} chart par laga di: ${picked
            .slice(0, 6)
            .map((m) => m.label)
            .join(", ")}${picked.length > 6 ? " …" : ""}`,
        },
      ]);
      setText("");
    },
    [markings, plan, tf],
  );

  const clearAll = () => {
    htfRef.current?.clear();
    ltfRef.current?.clear();
    setDrawn([]);
    setLog((prev) => [...prev, { role: "jenvu", body: "Chart saaf kar diya." }]);
  };

  const candles = useMemo(
    () => (tf === "htf" ? candleSet.htf : candleSet.ltf),
    [candleSet, tf],
  );

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="rounded-xl border bg-card">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b px-3 py-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold">XAU/USD</span>
            {plan ? (
              <span className="text-sm tabular-nums text-muted-foreground">
                {plan.currentPrice?.toFixed(2)}
              </span>
            ) : null}
          </div>
          <div className="flex items-center gap-1">
            {(["htf", "ltf"] as Tf[]).map((k) => (
              <Button
                key={k}
                size="sm"
                variant={tf === k ? "default" : "ghost"}
                onClick={() => setTf(k)}
              >
                {TF_LABEL[k]}
              </Button>
            ))}
            <Button size="sm" variant="ghost" onClick={clearAll} title="Clear markings">
              <Eraser className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="ghost" onClick={() => void load(true)} title="Refresh analysis">
              <RefreshCcw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="relative h-[520px]">
          {loading ? (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/70 text-sm text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Live chart aur analysis load ho rahi hai…
            </div>
          ) : null}
          {error ? (
            <div className="absolute inset-0 z-10 flex items-center justify-center px-6 text-center text-sm text-destructive">
              {error}
            </div>
          ) : null}
          <div className={tf === "htf" ? "absolute inset-0" : "hidden"}>
            <SignalChart ref={htfRef} candles={candleSet.htf} tf="htf" dark={false} title="XAUUSD · 4H" />
          </div>
          <div className={tf === "ltf" ? "absolute inset-0" : "hidden"}>
            <SignalChart ref={ltfRef} candles={candleSet.ltf} tf="ltf" dark={false} title="XAUUSD · 15M" />
          </div>
          {!loading && !error && candles.length === 0 ? (
            <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
              Candles available nahi hain.
            </div>
          ) : null}
        </div>
      </div>

      <div className="flex h-[580px] flex-col rounded-xl border bg-card">
        <div className="border-b px-3 py-2 text-sm font-semibold">Jenvu se marking karwaein</div>
        <div className="flex flex-wrap gap-1.5 border-b px-3 py-2">
          {QUICK_PROMPTS.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => submit(q)}
              className="rounded-full border px-2.5 py-1 text-xs text-muted-foreground hover:bg-accent"
            >
              {q}
            </button>
          ))}
        </div>
        <div className="flex-1 space-y-2 overflow-y-auto px-3 py-3 text-sm">
          {log.length === 0 ? (
            <p className="text-muted-foreground">
              Likhein jaise “4H par liquidity aur order block mark karo”. Jenvu wahi cheezain live chart
              par mark karega.
            </p>
          ) : null}
          {log.map((entry, i) => (
            <div
              key={i}
              className={
                entry.role === "you"
                  ? "ml-auto w-fit max-w-[90%] rounded-lg bg-primary px-3 py-1.5 text-primary-foreground"
                  : "w-fit max-w-[95%] rounded-lg bg-muted px-3 py-1.5"
              }
            >
              {entry.body}
            </div>
          ))}
        </div>
        {drawn.length ? (
          <div className="max-h-32 overflow-y-auto border-t px-3 py-2 text-xs text-muted-foreground">
            {drawn.map((m, i) => (
              <button
                key={`${m.label}-${i}`}
                type="button"
                className="block w-full truncate text-left hover:text-foreground"
                onClick={() => {
                  setTf(m.tf);
                  (m.tf === "htf" ? htfRef : ltfRef).current?.focusMarking(m);
                }}
              >
                {m.tf === "htf" ? "4H" : "15M"} · {m.label}
              </button>
            ))}
          </div>
        ) : null}
        <form
          className="flex items-center gap-2 border-t p-2"
          onSubmit={(e) => {
            e.preventDefault();
            submit(text);
          }}
        >
          <Input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Kya mark karna hai?"
            disabled={loading || !plan}
          />
          <Button type="submit" size="icon" disabled={loading || !plan || !text.trim()}>
            <SendHorizontal className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}
