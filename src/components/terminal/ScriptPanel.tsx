import { useEffect, useMemo, useState } from "react";
import { Plus, Play, Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import { SCRIPT_TEMPLATES, type ScriptResult } from "@/lib/chart/jenvu-script";

export type SavedScript = { id: string; name: string; source: string; enabled: boolean };

type Props = {
  scripts: SavedScript[];
  runs: Array<{ id: string; result?: ScriptResult; error?: string }>;
  onChange: (next: SavedScript[]) => void;
  onClose: () => void;
};

const newId = () => `s-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

function nameFromSource(source: string, fallback: string): string {
  const m = /(?:indicator|study|strategy)\(\s*["']([^"']+)["']/.exec(source);
  return (m?.[1] ?? fallback).slice(0, 48);
}

export function ScriptPanel({ scripts, runs, onChange, onClose }: Props) {
  const [activeId, setActiveId] = useState<string | null>(scripts[0]?.id ?? null);
  const active = scripts.find((s) => s.id === activeId) ?? null;
  const [draft, setDraft] = useState(active?.source ?? SCRIPT_TEMPLATES[0].source);

  useEffect(() => {
    if (active) setDraft(active.source);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId]);

  const run = useMemo(() => runs.find((r) => r.id === activeId), [runs, activeId]);
  const dirty = active ? draft !== active.source : true;
  const lineCount = draft.split("\n").length;

  function addFromTemplate(index: number) {
    const t = SCRIPT_TEMPLATES[index];
    const script: SavedScript = { id: newId(), name: t.name, source: t.source, enabled: true };
    onChange([...scripts, script]);
    setActiveId(script.id);
    setDraft(t.source);
  }

  function apply() {
    if (active) {
      onChange(
        scripts.map((s) =>
          s.id === active.id ? { ...s, source: draft, name: nameFromSource(draft, s.name), enabled: true } : s,
        ),
      );
    } else {
      const script: SavedScript = {
        id: newId(),
        name: nameFromSource(draft, `Script ${scripts.length + 1}`),
        source: draft,
        enabled: true,
      };
      onChange([...scripts, script]);
      setActiveId(script.id);
    }
  }

  return (
    <section
      aria-label="Jenvu Script editor"
      className="flex h-64 shrink-0 border-t border-border bg-card text-card-foreground"
    >
      <aside className="flex w-56 shrink-0 flex-col border-r border-border">
        <div className="flex h-9 items-center justify-between border-b border-border px-3">
          <span className="text-xs font-semibold">My scripts</span>
          <button
            type="button"
            onClick={() => {
              setActiveId(null);
              setDraft(`//@version=5\nindicator("My script", overlay=true)\nplot(ta.ema(close, 20), "EMA 20")`);
            }}
            className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
            aria-label="New script"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-1.5">
          {scripts.length === 0 && (
            <p className="px-2 py-2 text-[11px] text-muted-foreground">No scripts yet. Start from a template below.</p>
          )}
          {scripts.map((s) => {
            const r = runs.find((x) => x.id === s.id);
            return (
              <div
                key={s.id}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-1.5 py-1",
                  s.id === activeId && "bg-accent",
                )}
              >
                <Switch
                  checked={s.enabled}
                  onCheckedChange={(v) => onChange(scripts.map((x) => (x.id === s.id ? { ...x, enabled: v } : x)))}
                  aria-label={`Show ${s.name} on chart`}
                  className="scale-75"
                />
                <button
                  type="button"
                  onClick={() => setActiveId(s.id)}
                  className="min-w-0 flex-1 truncate text-left text-xs"
                >
                  {s.name}
                  {r?.error && <span className="ml-1 text-destructive">•</span>}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onChange(scripts.filter((x) => x.id !== s.id));
                    if (activeId === s.id) setActiveId(null);
                  }}
                  className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:text-destructive"
                  aria-label={`Delete ${s.name}`}
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            );
          })}
        </div>
        <div className="border-t border-border p-2">
          <p className="mb-1 px-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Templates</p>
          <div className="flex flex-wrap gap-1">
            {SCRIPT_TEMPLATES.map((t, i) => (
              <button
                type="button"
                key={t.name}
                onClick={() => addFromTemplate(i)}
                className="rounded border border-border px-1.5 py-0.5 text-[11px] hover:bg-accent"
              >
                {t.name}
              </button>
            ))}
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex h-9 shrink-0 items-center gap-2 border-b border-border px-3">
          <span className="truncate text-xs font-semibold">
            {active ? active.name : "New script"}
            {dirty && <span className="ml-1 font-normal text-muted-foreground">· unsaved</span>}
          </span>
          <span className="hidden text-[11px] text-muted-foreground md:inline">
            Pine-style: ta.ema, ta.sma, ta.rsi, ta.atr, crossover, plot, plotshape, hline…
          </span>
          <button
            type="button"
            onClick={apply}
            className="ml-auto flex h-7 items-center gap-1.5 rounded-md bg-primary px-2.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Play className="h-3 w-3" />
            {active ? "Update on chart" : "Add to chart"}
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close script editor"
            className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex min-h-0 flex-1 overflow-hidden">
          <pre
            aria-hidden="true"
            className="select-none overflow-hidden border-r border-border bg-muted px-2 py-2 text-right font-mono text-[12px] leading-5 text-muted-foreground"
          >
            {Array.from({ length: lineCount }, (_, i) => i + 1).join("\n")}
          </pre>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                e.preventDefault();
                apply();
              }
              if (e.key === "Tab") {
                e.preventDefault();
                const el = e.currentTarget;
                const start = el.selectionStart;
                const next = `${draft.slice(0, start)}    ${draft.slice(el.selectionEnd)}`;
                setDraft(next);
                requestAnimationFrame(() => el.setSelectionRange(start + 4, start + 4));
              }
            }}
            spellCheck={false}
            aria-label="Script source"
            className="min-w-0 flex-1 resize-none bg-card px-3 py-2 font-mono text-[12px] leading-5 outline-none"
          />
        </div>
        <div
          role="status"
          className={cn(
            "shrink-0 border-t border-border px-3 py-1 font-mono text-[11px]",
            run?.error ? "text-destructive" : "text-muted-foreground",
          )}
        >
          {run?.error
            ? run.error
            : run?.result
              ? `✓ ${run.result.name}: ${run.result.plots.length} plot(s), ${run.result.shapes.length} signal set(s)${run.result.warnings.length ? ` · ${run.result.warnings[0]}` : ""}`
              : "Ctrl/⌘ + Enter to run. Scripts are saved in this browser and the AI desk can read them."}
        </div>
      </div>
    </section>
  );
}
