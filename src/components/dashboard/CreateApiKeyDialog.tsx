import { CalendarDays, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";

export function CreateApiKeyDialog({ open, onOpenChange, name, onNameChange, creating, onCreate, planName, keyLimit }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  name: string;
  onNameChange: (name: string) => void;
  creating: boolean;
  onCreate: () => Promise<void>;
  planName: string;
  keyLimit: number;
}) {
  return (
    <Dialog open={open} onOpenChange={(next) => { if (!creating) onOpenChange(next); }}>
      <DialogContent onOpenAutoFocus={(event) => event.preventDefault()} className="api-create-dialog w-[calc(100%-32px)] max-w-[480px] gap-0 rounded-3xl p-4 sm:rounded-3xl" overlayClassName="api-create-overlay">
        <DialogTitle className="text-left text-base font-medium tracking-normal">Create API Key</DialogTitle>
        <DialogDescription className="sr-only">Name your new Jenvu API key.</DialogDescription>
        <form onSubmit={(event) => { event.preventDefault(); void onCreate(); }}>
          <label htmlFor="create-api-key-name" className="mb-2 mt-5 block text-[13px] text-foreground">Name</label>
          <div className="api-create-input flex h-9 items-center gap-3 rounded-md border border-border px-3 focus-within:border-foreground">
            <input id="create-api-key-name" value={name} maxLength={60} onChange={(event) => onNameChange(event.target.value)} placeholder="Production key" className="min-w-0 flex-1 bg-transparent text-[13px] text-foreground outline-none placeholder:text-muted-foreground" />
            <span className="shrink-0 text-xs tabular-nums text-muted-foreground" aria-live="polite">{name.length}/60</span>
          </div>
          <details className="group mt-5 text-[13px] text-foreground">
            <summary className="flex w-fit cursor-pointer list-none items-center gap-2 [&::-webkit-details-marker]:hidden">Advanced settings <ChevronDown className="h-3.5 w-3.5 transition-transform group-open:rotate-180" /></summary>
            <div className="mt-4 grid grid-cols-2 gap-x-3 gap-y-4">
              <label className="space-y-2 text-xs text-muted-foreground">Models<Button type="button" disabled variant="outline" className="api-create-option w-full justify-between rounded-md font-normal">All models<ChevronDown /></Button></label>
              <label className="space-y-2 text-xs text-muted-foreground">Endpoints<Button type="button" disabled variant="outline" className="api-create-option w-full justify-between rounded-md font-normal">All endpoints<ChevronDown /></Button></label>
              <label className="space-y-2 text-xs text-muted-foreground">Tokens per minute<input disabled placeholder="Plan limit" className="api-create-option w-full rounded-md border border-border bg-transparent px-3 text-xs" /></label>
              <label className="space-y-2 text-xs text-muted-foreground">Requests per minute<input disabled placeholder="Plan limit" className="api-create-option w-full rounded-md border border-border bg-transparent px-3 text-xs" /></label>
              <label className="col-span-2 space-y-2 text-xs text-muted-foreground">Expiry<Button type="button" disabled variant="outline" className="api-create-option w-full justify-start rounded-md font-normal"><CalendarDays />No expiry</Button></label>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-muted-foreground">Custom restrictions are not available. Your {planName} plan limits apply · {keyLimit} active key{keyLimit === 1 ? "" : "s"}.</p>
          </details>
          <div className="mt-8 flex items-center justify-between gap-3">
            <Button type="button" variant="outline" size="sm" className="rounded-full font-normal" disabled={creating} onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" size="sm" className="rounded-full" disabled={creating}>{creating ? "Creating…" : "Create API key"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}