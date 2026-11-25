import { useEffect, useState } from "react";
import { Activity, Check, Layers, Search, Star, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { SmcToggles } from "@/lib/chart/smc-overlay";
import { INDICATOR_LIST, type IndicatorId } from "./indicator-specs";

type Category = "Technicals" | "SMC Concepts" | "ICT" | "Strategies" | "Favorites";
type Overlay = { key: keyof SmcToggles; label: string; hint: string; locked: boolean; available: boolean; active: boolean };
type Props = {
  open: boolean; onOpenChange: (open: boolean) => void; theme: "light" | "dark";
  indicators: IndicatorId[]; onToggle: (id: IndicatorId) => void;
  overlays: Overlay[]; onOverlayToggle: (key: keyof SmcToggles) => void;
  onDefaults: () => void;
};
const FAVORITES_KEY = "jenvu:terminal:indicator-favorites:v1";
const categories: Category[] = ["Favorites", "Technicals", "SMC Concepts", "ICT", "Strategies"];

export function IndicatorLibrary({ open, onOpenChange, theme, indicators, onToggle, overlays, onOverlayToggle, onDefaults }: Props) {
  const [category, setCategory] = useState<Category>("Technicals");
  const [search, setSearch] = useState("");
  const [favorites, setFavorites] = useState<string[]>([]);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    try {
      const saved: unknown = JSON.parse(localStorage.getItem(FAVORITES_KEY) ?? "[]");
      if (Array.isArray(saved)) setFavorites(saved.filter((v): v is string => typeof v === "string"));
    } catch { /* storage unavailable */ }
    setReady(true);
  }, []);
  useEffect(() => {
    if (!ready) return;
    try { localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites)); } catch { /* storage unavailable */ }
  }, [favorites, ready]);
  const rows = [
    ...INDICATOR_LIST.map((spec) => ({ id: spec.id, name: spec.name, hint: spec.description, category: "Technicals" as Category, active: indicators.includes(spec.id), locked: false, available: true, toggle: () => onToggle(spec.id) })),
    ...overlays.map((item) => ({ id: `smc:${item.key}`, name: item.label, hint: item.hint, category: (item.key === "sdStrategy" || item.key === "sdHistory" || item.key === "priceAction" || item.key === "swingSweep" ? "Strategies" : item.key === "freshFvg" || item.key === "orderBlocks" || item.key === "liquidity" || item.key === "sweeps" ? "ICT" : "SMC Concepts") as Category, active: item.active, locked: item.locked, available: item.available, toggle: () => onOverlayToggle(item.key) })),
  ];
  const query = search.trim().toLowerCase();
  const visible = rows.filter((r) => query ? `${r.name} ${r.hint} ${r.category}`.toLowerCase().includes(query) : category === "Favorites" ? favorites.includes(r.id) : category === "SMC Concepts" ? r.category !== "Technicals" : r.category === category);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent overlayClassName="bg-transparent backdrop-filter-none" aria-describedby="indicator-library-description" className={cn("flex h-[min(540px,calc(100dvh-2rem))] w-[calc(100vw-1rem)] max-w-[700px] flex-col gap-0 overflow-hidden rounded-lg border-border bg-background p-0 text-foreground font-sans", theme === "dark" && "dark terminal-dark")}>
        <div className="px-5 pb-3 pt-5">
          <DialogTitle className="pr-7 text-lg font-normal leading-6 tracking-normal sm:text-xl">Indicators, metrics, and strategies</DialogTitle>
          <DialogDescription id="indicator-library-description" className="sr-only">Jenvu chart indicators and smart-money overlays</DialogDescription>
          <div className="relative mt-3">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input aria-label="Search indicators" placeholder="Search" value={search} onChange={(e) => setSearch(e.target.value)} className="h-10 rounded-lg border-border pl-10 font-normal shadow-none" />
          </div>
        </div>
        <div className="flex min-h-0 flex-1 flex-col sm:flex-row">
          <nav aria-label="Indicator categories" className="flex shrink-0 gap-1 overflow-x-auto border-b border-border px-3 pb-3 sm:w-44 sm:flex-col sm:border-b-0 sm:px-3">
            {categories.map((name) => {
              const Icon = name === "Favorites" ? Star : name === "Technicals" ? Activity : name === "Strategies" ? TrendingUp : Layers;
              return <Button key={name} variant="ghost" onClick={() => { setCategory(name); setSearch(""); }} aria-pressed={category === name} className={cn("h-10 shrink-0 justify-start gap-3 rounded-lg px-3 font-normal", category === name && "bg-accent text-accent-foreground")}><Icon />{name}</Button>;
            })}
          </nav>
          <div className="min-h-0 min-w-0 flex-1 overflow-y-auto px-3 pb-3 sm:pr-6">
            <div className="flex h-9 items-center justify-between px-2 text-[11px] uppercase text-muted-foreground"><span>{query ? "Search results" : category}</span><span>{visible.length}</span></div>
            {visible.length === 0 && <p className="px-2 py-10 text-sm text-muted-foreground">{category === "Favorites" && !query ? "No favorites yet." : "No matching indicators."}</p>}
            {visible.map((row) => <div key={row.id} className="flex min-h-14 items-center gap-1 rounded-md hover:bg-accent/60">
              <Button variant="ghost" size="icon-sm" aria-label={`${favorites.includes(row.id) ? "Unfavorite" : "Favorite"} ${row.name}`} aria-pressed={favorites.includes(row.id)} onClick={() => setFavorites((cur) => cur.includes(row.id) ? cur.filter((id) => id !== row.id) : [...cur, row.id])} className="shrink-0 text-muted-foreground"><Star className={cn(favorites.includes(row.id) && "fill-current text-foreground")} /></Button>
              <Button variant="ghost" aria-pressed={row.active} disabled={row.locked || !row.available} onClick={row.toggle} className="h-auto min-h-14 min-w-0 flex-1 justify-between whitespace-normal px-2 py-2 text-left font-normal">
                <span className="min-w-0"><span className="block text-sm">{row.name}</span><span className="block text-xs text-muted-foreground">{!row.available ? "Available on supported timeframes" : row.locked ? "Daily strategy hours used" : row.hint}</span></span>
                {row.active && <Check className="ml-2 shrink-0" />}
              </Button>
            </div>)}
          </div>
        </div>
        <div className="flex shrink-0 items-center justify-between gap-2 border-t border-border px-5 py-3 text-xs text-muted-foreground"><span>{indicators.length} selected</span><Button variant="secondary" size="sm" className="font-normal" onClick={onDefaults}>Restore defaults</Button></div>
      </DialogContent>
    </Dialog>
  );
}