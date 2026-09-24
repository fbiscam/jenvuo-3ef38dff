import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import type { DemoPosition } from "@/lib/chart/demo-trading";

export type DemoOrderActions = {
  update: (id: string, patch: Partial<Pick<DemoPosition, "stopLoss" | "takeProfit">>) => void;
  close: (id: string) => void;
};

type Props = {
  positions: DemoPosition[];
  price: number | null;
  priceToY: (price: number) => number | null;
  yToPrice: (y: number) => number | null;
  areaWidth: () => number;
  actions: DemoOrderActions | null;
};

const UP = "#089981";
const DOWN = "#f23645";
const SL = "#f7931a";

const fmt = (v: number) => `${v >= 0 ? "+" : "−"}${Math.abs(v).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`;

type Drag = { id: string; kind: "stopLoss" | "takeProfit"; price: number };

/** TradingView-style order lines: entry, draggable TP and SL with live P&L labels. */
export function DemoOrderOverlay({ positions, price, priceToY, yToPrice, areaWidth, actions }: Props) {
  const [, setTick] = useState(0);
  const [drag, setDrag] = useState<Drag | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  // Re-measure while the chart pans/zooms.
  useEffect(() => {
    if (!positions.length) return;
    const id = window.setInterval(() => setTick((t) => t + 1), 120);
    return () => window.clearInterval(id);
  }, [positions.length]);

  useEffect(() => {
    if (!drag) return;
    const move = (e: PointerEvent) => {
      const rect = wrapRef.current?.getBoundingClientRect();
      if (!rect) return;
      const p = yToPrice(e.clientY - rect.top);
      if (p != null) setDrag((d) => (d ? { ...d, price: Math.round(p * 100) / 100 } : d));
    };
    const up = () => {
      setDrag((d) => {
        if (d) actions?.update(d.id, { [d.kind]: d.price });
        return null;
      });
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up, { once: true });
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
  }, [drag, actions, yToPrice]);

  if (!positions.length) return null;
  const width = areaWidth();

  const startDrag = (e: React.PointerEvent, id: string, kind: Drag["kind"], at: number) => {
    e.preventDefault();
    e.stopPropagation();
    setDrag({ id, kind, price: at });
  };

  return (
    <div ref={wrapRef} className="pointer-events-none absolute inset-0 z-[4] font-sans">
      {positions.map((pos) => {
        const dir = pos.side === "buy" ? 1 : -1;
        const pnlAt = (p: number) => (p - pos.entryPrice) * dir * pos.quantity;
        const sl = drag?.id === pos.id && drag.kind === "stopLoss" ? drag.price : pos.stopLoss ?? null;
        const tp = drag?.id === pos.id && drag.kind === "takeProfit" ? drag.price : pos.takeProfit ?? null;
        const live = price == null ? 0 : pnlAt(price);
        const sideColor = pos.side === "buy" ? UP : DOWN;
        const qty = `${pos.side === "sell" ? "−" : ""}${pos.quantity}`;

        const row = (at: number, color: string, content: React.ReactNode, key: string, dashed = false) => {
          const y = priceToY(at);
          if (y == null) return null;
          return (
            <div key={key} className="absolute left-0" style={{ top: y, width }}>
              <div className="absolute left-0 right-0" style={{ borderTop: `1px ${dashed ? "dashed" : "solid"} ${color}` }} />
              <div className="absolute right-3 flex -translate-y-1/2 items-center gap-1.5">{content}</div>
            </div>
          );
        };

        const box = (color: string, left: React.ReactNode, value: number, onClose: () => void, onDown?: (e: React.PointerEvent) => void, solidLeft = false) => (
          <div
            onPointerDown={onDown}
            className="pointer-events-auto flex h-6 items-stretch overflow-hidden rounded border bg-background text-xs shadow-sm"
            style={{ borderColor: color, cursor: onDown ? "ns-resize" : "default" }}
          >
            <span className="flex items-center px-2 font-medium" style={solidLeft ? { background: color, color: "#fff" } : { color, borderRight: `1px solid ${color}` }}>{left}</span>
            <span className="flex min-w-[96px] items-center justify-end px-2 font-mono font-medium" style={{ color: value >= 0 ? UP : DOWN }}>{fmt(value)}</span>
            <button
              type="button"
              aria-label="Remove"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={onClose}
              className="flex items-center px-1.5"
              style={{ color, borderLeft: `1px solid ${color}` }}
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        );

        const pill = (label: string, color: string, kind: Drag["kind"], def: number) => (
          <button
            type="button"
            onPointerDown={(e) => startDrag(e, pos.id, kind, def)}
            className="pointer-events-auto h-6 rounded border bg-background px-1.5 text-[11px] font-medium"
            style={{ borderColor: color, color, cursor: "ns-resize" }}
            title={`Drag to set ${label}`}
          >
            {label}
          </button>
        );

        return [
          tp != null && row(tp, UP, box(UP, qty, pnlAt(tp), () => actions?.update(pos.id, { takeProfit: null }), (e) => startDrag(e, pos.id, "takeProfit", tp)), `${pos.id}-tp`),
          sl != null && row(sl, SL, box(SL, qty, pnlAt(sl), () => actions?.update(pos.id, { stopLoss: null }), (e) => startDrag(e, pos.id, "stopLoss", sl)), `${pos.id}-sl`),
          row(
            pos.entryPrice,
            sideColor,
            <>
              {tp == null && pill("TP", UP, "takeProfit", pos.entryPrice + 5 * dir)}
              {sl == null && pill("SL", SL, "stopLoss", pos.entryPrice - 5 * dir)}
              {box(sideColor, qty, live, () => actions?.close(pos.id), undefined, true)}
            </>,
            `${pos.id}-entry`,
          ),
        ];
      })}
    </div>
  );
}
