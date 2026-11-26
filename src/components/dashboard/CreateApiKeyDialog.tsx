import { useEffect, useState } from "react";
import { CalendarDays, ChevronDown, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { MODEL_CATALOG } from "@/lib/model-catalog";
import type { ApiKeyOptions } from "@/lib/api-key-policy";

export function CreateApiKeyDialog({ open, onOpenChange, name, onNameChange, creating, onCreate, planName, keyLimit }: {
  open: boolean; onOpenChange: (open: boolean) => void; name: string;
  onNameChange: (name: string) => void; creating: boolean;
  onCreate: (options: ApiKeyOptions) => Promise<void>; planName: string; keyLimit: number;
}) {
  const [modelsOpen, setModelsOpen] = useState(false);
  const [selected, setSelected] = useState<string[] | null>(null);
  const [query, setQuery] = useState("");
  const [expiryOpen, setExpiryOpen] = useState(false);
  const [expiry, setExpiry] = useState("");
  const [draftExpiry, setDraftExpiry] = useState("");
  const [expiryError, setExpiryError] = useState("");
  useEffect(() => {
    if (open) { setSelected(null); setModelsOpen(false); setQuery(""); setExpiry(""); setDraftExpiry(""); setExpiryOpen(false); setExpiryError(""); }
  }, [open]);
  const localDate = (date: Date) => new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  const toggleModel = (id: string) => {
    const current = selected ?? MODEL_CATALOG.map((m) => m.id);
    const next = current.includes(id) ? current.filter((m) => m !== id) : [...current, id];
    setSelected(next.length === MODEL_CATALOG.length ? null : next);
  };
  const saveExpiry = () => {
    if (draftExpiry && (!Number.isFinite(Date.parse(draftExpiry)) || Date.parse(draftExpiry) <= Date.now())) {
      setExpiryError("Choose a future date and time."); return;
    }
    setExpiry(draftExpiry); setExpiryOpen(false); setExpiryError("");
  };
  return (
    <Dialog open={open} onOpenChange={(next) => { if (!creating) onOpenChange(next); }}>
      <DialogContent onOpenAutoFocus={(event) => event.preventDefault()} className="api-create-dialog w-[calc(100%-32px)] max-w-[480px] max-h-[90dvh] overflow-y-auto gap-0 rounded-3xl p-4 sm:rounded-3xl" overlayClassName="api-create-overlay">
        <DialogTitle className="text-left text-base font-medium tracking-normal">Create API Key</DialogTitle>
        <DialogDescription className="sr-only">Name your key and choose its models and expiry.</DialogDescription>
        <form onSubmit={(event) => { event.preventDefault(); void onCreate({ allowedModels: selected, expiresAt: expiry ? new Date(expiry).toISOString() : null }); }}>
          <label htmlFor="create-api-key-name" className="mb-2 mt-5 block text-[13px] text-foreground">Name</label>
          <div className="api-create-input flex h-9 items-center gap-3 rounded-md border border-border px-3 focus-within:border-foreground">
            <input id="create-api-key-name" value={name} maxLength={60} onChange={(event) => onNameChange(event.target.value)} placeholder="Production key" className="min-w-0 flex-1 bg-transparent text-[13px] text-foreground outline-none placeholder:text-muted-foreground" />
            <span className="shrink-0 text-xs tabular-nums text-muted-foreground" aria-live="polite">{name.length}/60</span>
          </div>
          <details className="group mt-5 text-[13px] text-foreground">
            <summary className="flex w-fit cursor-pointer list-none items-center gap-2 [&::-webkit-details-marker]:hidden">Advanced settings <ChevronDown className="h-3.5 w-3.5 transition-transform group-open:rotate-180" /></summary>
            <div className="mt-4 grid grid-cols-2 gap-x-3 gap-y-4">
              <div className="col-span-2 space-y-2">
                <span className="text-xs text-muted-foreground">Models</span>
                <Button type="button" variant="outline" aria-expanded={modelsOpen} aria-controls="api-key-models" className="api-create-option w-full justify-between rounded-md font-normal" onClick={() => setModelsOpen((v) => !v)}>{selected === null ? "All models" : `${selected.length} models selected`}<ChevronDown /></Button>
                {modelsOpen && <div id="api-key-models" className="rounded-md border border-border p-2">
                  <label className="mb-2 flex items-center gap-2 border-b border-border pb-2"><Search className="h-3.5 w-3.5 text-muted-foreground" /><input aria-label="Search models" placeholder="Search models" value={query} onChange={(e) => setQuery(e.target.value)} className="min-w-0 flex-1 bg-transparent text-xs outline-none" /></label>
                  <div className="mb-1 flex justify-between"><Button type="button" variant="ghost" size="sm" onClick={() => setSelected(null)}>Select all</Button><Button type="button" variant="ghost" size="sm" onClick={() => setSelected([])}>Clear</Button></div>
                  <div className="max-h-48 overflow-y-auto">
                    {MODEL_CATALOG.filter((m) => `${m.name} ${m.id}`.toLowerCase().includes(query.toLowerCase())).map((model) => <label key={model.id} className="flex cursor-pointer items-center gap-2 rounded px-2 py-2 hover:bg-muted"><input type="checkbox" checked={selected === null || selected.includes(model.id)} onChange={() => toggleModel(model.id)} className="accent-foreground" /><span className="text-xs">{model.name}</span></label>)}
                    {!MODEL_CATALOG.some((m) => `${m.name} ${m.id}`.toLowerCase().includes(query.toLowerCase())) && <p className="p-2 text-xs text-muted-foreground">No models found.</p>}
                  </div>
                </div>}
              </div>
              <label className="space-y-2 text-xs text-muted-foreground">Tokens per minute<input disabled placeholder="Plan limit" className="api-create-option w-full rounded-md border border-border bg-transparent px-3 text-xs" /></label>
              <label className="space-y-2 text-xs text-muted-foreground">Requests per minute<input disabled placeholder="Plan limit" className="api-create-option w-full rounded-md border border-border bg-transparent px-3 text-xs" /></label>
              <div className="col-span-2 space-y-2">
                <span className="text-xs text-muted-foreground">Expiry</span>
                <Button type="button" variant="outline" aria-expanded={expiryOpen} className="api-create-option w-full justify-start rounded-md font-normal" onClick={() => { setDraftExpiry(expiry); setExpiryError(""); setExpiryOpen((v) => !v); }}><CalendarDays />{expiry ? new Date(expiry).toLocaleString() : "No expiry"}</Button>
                {expiryOpen && <div className="space-y-3 rounded-md border border-border p-3">
                  <label className="block space-y-2 text-xs">Expiry date and time<input aria-label="Expiry date and time" type="datetime-local" value={draftExpiry} min={localDate(new Date())} onChange={(e) => { setDraftExpiry(e.target.value); setExpiryError(""); }} className="block h-9 w-full rounded-md border border-border bg-background px-2 text-foreground outline-none focus:border-foreground" /></label>
                  <div className="flex flex-wrap gap-1">{[1, 5, 30, 90].map((days) => <Button key={days} type="button" size="sm" variant="outline" onClick={() => setDraftExpiry(localDate(new Date(Date.now() + days * 86400000)))}>{days} day{days > 1 ? "s" : ""}</Button>)}</div>
                  {expiryError && <p role="alert" className="text-xs text-destructive">{expiryError}</p>}
                  <div className="flex flex-wrap justify-between gap-2"><Button type="button" size="sm" variant="ghost" onClick={() => { setExpiry(""); setExpiryOpen(false); }}>No expiry</Button><div className="flex gap-2"><Button type="button" size="sm" variant="outline" onClick={() => setExpiryOpen(false)}>Cancel</Button><Button type="button" size="sm" onClick={saveExpiry}>OK</Button></div></div>
                </div>}
              </div>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-muted-foreground">Your {planName} plan rate limits apply · {keyLimit} active key{keyLimit === 1 ? "" : "s"}.</p>
          </details>
          <div className="mt-8 flex items-center justify-between gap-3">
            <Button type="button" variant="outline" size="sm" className="rounded-full font-normal" disabled={creating} onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" size="sm" className="rounded-full" disabled={creating || selected?.length === 0 || expiryOpen}>{creating ? "Creating…" : "Create API key"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
