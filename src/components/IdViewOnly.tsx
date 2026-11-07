import type { ReactNode, SyntheticEvent } from "react";
import { toast } from "sonner";
import { ID_ACTION_MESSAGE } from "@/lib/id-gate";

const ACTION =
  'button, input, textarea, select, label, [role="button"], [role="switch"], [role="checkbox"], [role="combobox"], [role="menuitem"], [role="option"], [contenteditable="true"]';

let go: (() => void) | null = null;

function notify() {
  toast(ID_ACTION_MESSAGE, {
    id: "id-view-only",
    duration: 5000,
    action: { label: "Verify ID now", onClick: () => go?.() },
  });
}

/**
 * Look-only wrapper for members whose ID isn't verified: the page shows normally, links
 * still navigate, but buttons, fields and menus do nothing and a short notice explains why.
 */
export function IdViewOnly({ children, onVerify }: { children: ReactNode; onVerify: () => void }) {
  go = onVerify;
  const block = (e: SyntheticEvent, tell: boolean) => {
    const el = (e.target as HTMLElement | null)?.closest?.(ACTION);
    if (!el) return;
    e.preventDefault();
    e.stopPropagation();
    if (tell) notify();
  };
  return (
    <div
      className="id-view-only"
      onClickCapture={(e) => block(e, true)}
      onPointerDownCapture={(e) => block(e, false)}
      onMouseDownCapture={(e) => block(e, false)}
      onKeyDownCapture={(e) => block(e, false)}
      onSubmitCapture={(e) => {
        e.preventDefault();
        e.stopPropagation();
        notify();
      }}
      onFocusCapture={(e) => {
        const el = e.target as HTMLElement;
        if (el.matches?.("input, textarea, select, [contenteditable='true']")) el.blur();
      }}
    >
      {children}
    </div>
  );
}
