import { useCallback, useEffect, useRef, useState } from "react";
import { Gift } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { GIFT_REASONS, countUnseenGifts, giftTitle } from "@/lib/gifts";
import { shortTitle } from "@/lib/notice-text";

type GiftRow = { id: string; delta: number; reason: string; created_at: string };

function timeAgo(iso: string): string {
  const s = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

/** Top-bar Gifts box: every credit gift sent to this account, with a dot for new ones. */
export default function GiftBox() {
  const [open, setOpen] = useState(false);
  const [uid, setUid] = useState<string | null>(null);
  const [items, setItems] = useState<GiftRow[]>([]);
  const [seenAt, setSeenAt] = useState<string | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const seenKey = uid ? `jenvu:gifts:seen:${uid}` : null;

  const load = useCallback(async () => {
    const { data: u } = await supabase.auth.getUser();
    const id = u.user?.id;
    if (!id) return;
    setUid(id);
    setSeenAt(window.localStorage.getItem(`jenvu:gifts:seen:${id}`));
    const { data } = await supabase
      .from("credit_ledger")
      .select("id,delta,reason,created_at")
      .eq("user_id", id)
      .gt("delta", 0)
      .in("reason", [...GIFT_REASONS])
      .order("created_at", { ascending: false })
      .limit(20);
    setItems((data ?? []) as GiftRow[]);
  }, []);

  useEffect(() => {
    void load();
    const t = window.setInterval(() => { if (document.visibilityState === "visible") void load(); }, 300_000);
    const onFocus = () => void load();
    window.addEventListener("focus", onFocus);
    return () => { window.clearInterval(t); window.removeEventListener("focus", onFocus); };
  }, [load]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false); };
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [open]);

  const unseen = countUnseenGifts(items, seenAt);

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next && seenKey) {
      const now = new Date().toISOString();
      window.localStorage.setItem(seenKey, now);
      // Keep the highlight on new rows while the box is open; the dot clears.
      window.setTimeout(() => setSeenAt(now), 0);
    }
  };

  return (
    <div className="relative" ref={wrapRef}>
      <button
        type="button"
        onClick={toggle}
        aria-label={unseen ? `Gifts, ${unseen} new` : "Gifts"}
        title="Gifts"
        className="relative inline-flex h-9 w-9 items-center justify-center rounded-full text-gc-ink-muted transition-colors hover:bg-gc-notice"
      >
        <Gift className="h-4 w-4" />
        {unseen > 0 && (
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-destructive ring-2 ring-background" aria-hidden="true" />
        )}
      </button>

      {open && (
        <div className="fixed right-2 top-14 z-50 w-[min(20rem,calc(100vw-1rem))] overflow-hidden rounded-xl bg-background shadow-[0_4px_16px_rgba(60,64,67,0.18),0_1px_3px_rgba(60,64,67,0.12)] sm:absolute sm:left-auto sm:right-0 sm:top-11 sm:w-[300px]">
          <div className="border-b border-gc-blue-deep/25 px-3 py-2.5 text-center sm:px-4 sm:py-3.5 text-[14px] text-gc-ink">Gifts</div>
          <div className="max-h-[min(55vh,360px)] sm:max-h-[min(420px,70vh)] scroll-on-hover overflow-y-auto overscroll-contain py-1">
            {items.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <p className="text-[13px] text-gc-ink">No gifts yet</p>
                <p className="mt-0.5 text-[12px] text-gc-ink-muted">Credit gifts, bonuses and referral rewards show up here.</p>
              </div>
            ) : (
              items.map((g) => (
                <div key={g.id} className="flex items-start gap-2.5 px-3 py-2 hover:bg-gc-nav-active sm:gap-3 sm:px-4 sm:py-3">
                  <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 sm:h-8 sm:w-8 items-center justify-center rounded-full bg-gc-nav-active text-gc-blue-deep">
                    <Gift className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] text-gc-ink sm:text-[14px]">{shortTitle(giftTitle(g.reason))}</p>
                    <p className="mt-0.5 line-clamp-3 text-[12px] text-gc-ink-muted sm:text-[13px]">+${Number(g.delta).toFixed(2)} credit </p>
                  </div>
                  <span className="shrink-0 text-[11px] text-gc-ink-muted sm:text-[12px]">{timeAgo(g.created_at)}</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
