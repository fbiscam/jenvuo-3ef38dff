import { ChevronDown } from "lucide-react";
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
      <DialogContent className="api-create-dialog w-[calc(100%-32px)] max-w-lg gap-0 rounded-3xl p-4 sm:rounded-3xl" overlayClassName="api-create-overlay">
        <DialogTitle className="text-left text-base font-medium tracking-normal">Create API Key</DialogTitle>
        <DialogDescription className="sr-only">Name your new Jenvu API key.</DialogDescription>
        <form onSubmit={(event) => { event.preventDefault(); void onCreate(); }}>
          <label htmlFor="create-api-key-name" className="mb-3 mt-6 block text-sm text-foreground">Name</label>
          <div className="api-create-input flex h-10 items-center gap-3 rounded-lg border-2 border-foreground px-3 focus-within:ring-1 focus-within:ring-ring">
            <input id="create-api-key-name" autoFocus value={name} maxLength={60} onChange={(event) => onNameChange(event.target.value)} placeholder="Production key" className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground" />
            <span className="shrink-0 text-xs tabular-nums text-muted-foreground" aria-live="polite">{name.length}/60</span>
          </div>
          <details className="group mt-6 text-[13px] text-foreground">
            <summary className="flex w-fit cursor-pointer list-none items-center gap-2 [&::-webkit-details-marker]:hidden">Advanced settings <ChevronDown className="h-3.5 w-3.5 transition-transform group-open:rotate-180" /></summary>
            <dl className="mt-3 grid grid-cols-2 gap-2 text-xs text-muted-foreground"><dt>Plan</dt><dd className="text-right">{planName}</dd><dt>Active key limit</dt><dd className="text-right">{keyLimit}</dd></dl>
          </details>
          <div className="mt-10 flex items-center justify-between gap-3">
            <Button type="button" variant="outline" className="rounded-full font-normal" disabled={creating} onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" className="rounded-full" disabled={creating}>{creating ? "Creating…" : "Create API key"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}