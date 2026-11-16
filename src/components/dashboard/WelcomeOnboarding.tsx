import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Bot, Check, CandlestickChart, Code2, MessageSquareText, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const OPTIONS = [
  { id: "signals", title: "Live SMC & ICT signals", desc: "Sweeps, zones and fair value gaps on Gold, Bitcoin and EUR/USD.", Icon: CandlestickChart },
  { id: "ai_desk", title: "AI trading desk", desc: "Ask the chart copilot about structure, levels and news.", Icon: MessageSquareText },
  { id: "extension_api", title: "Extension & API", desc: "Bring Jenvu models into your browser and your own apps.", Icon: Code2 },
  { id: "jx_bot", title: "JX Bot on MT5", desc: "Automate EUR/USD. Unlocks for verified Founding members.", Icon: Bot },
] as const;

const FONT = { fontFamily: "'Google Sans Flex','Google Sans',sans-serif" };
const NEW_ACCOUNT_MS = 3 * 24 * 60 * 60 * 1000;

function Tick({ on }: { on: boolean }) {
  return (
    <span
      className={`mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[5px] border transition-colors ${
        on ? "border-foreground bg-foreground text-background" : "border-border bg-background"
      }`}
    >
      {on && <Check className="h-3 w-3" strokeWidth={3} />}
    </span>
  );
}

/**
 * Two-step welcome shown once to newly signed-up users; the choice is saved on the account.
 * Rendered in a portal on <body> so it always uses the white site theme, even inside the dark dashboard.
 */
export default function WelcomeOnboarding() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [adult, setAdult] = useState(false);
  const [updates, setUpdates] = useState(true);
  const [selected, setSelected] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void supabase.auth.getUser().then(({ data }) => {
      const u = data.user;
      if (!u) return;
      const meta = (u.user_metadata ?? {}) as Record<string, unknown>;
      const isNew = Date.now() - new Date(u.created_at).getTime() < NEW_ACCOUNT_MS;
      if (isNew && !meta.onboarding_completed_at) setOpen(true);
    });
  }, []);

  const finish = async (goal: string | null) => {
    setSaving(true);
    await supabase.auth.updateUser({
      data: {
        onboarding_goal: goal,
        onboarding_product_updates: updates,
        onboarding_completed_at: new Date().toISOString(),
      },
    });
    setSaving(false);
    setOpen(false);
  };

  if (!open || typeof document === "undefined") return null;

  const pill =
    "whitespace-nowrap rounded-full px-5 py-2.5 text-[14px] font-medium transition-colors sm:px-6 disabled:cursor-not-allowed disabled:opacity-40";

  return createPortal(
    <div
      className="fixed inset-0 z-[10000] flex items-end justify-center overflow-y-auto bg-foreground/40 p-3 backdrop-blur-sm animate-in fade-in duration-200 sm:items-center sm:p-6"
      style={FONT}
      role="dialog"
      aria-modal="true"
      aria-labelledby="welcome-title"
    >
      <div className="w-full max-w-[460px] rounded-[22px] border border-border bg-background p-6 text-foreground shadow-2xl animate-in zoom-in-95 slide-in-from-bottom-2 duration-300 sm:p-7">
        <div className="flex items-center justify-between">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-foreground text-background">
            <Sparkles className="h-4 w-4" />
          </span>
          <div className="flex gap-1.5" aria-label={`Step ${step} of 2`}>
            <span className="h-1 w-6 rounded-full bg-foreground" />
            <span className={`h-1 w-6 rounded-full ${step === 2 ? "bg-foreground" : "bg-border"}`} />
          </div>
        </div>

        {step === 1 ? (
          <>
            <h2 id="welcome-title" className="mt-5 text-[22px] font-medium leading-tight tracking-[-0.01em]">
              Welcome to Jenvu
            </h2>
            <p className="mt-2 text-[14px] leading-relaxed text-muted-foreground">
              Your desk for Gold: live charts, SMC & ICT tools, an AI copilot and the Jenvu API, all in one place.
            </p>
            <div className="mt-5 space-y-2">
              <button
                type="button"
                onClick={() => setAdult((v) => !v)}
                className="flex w-full items-start gap-3 rounded-xl border border-border px-4 py-3 text-left text-[13.5px] leading-snug hover:bg-muted"
                aria-pressed={adult}
              >
                <Tick on={adult} />
                <span>I confirm I am 18 or older and understand trading carries risk.</span>
              </button>
              <button
                type="button"
                onClick={() => setUpdates((v) => !v)}
                className="flex w-full items-start gap-3 rounded-xl border border-border px-4 py-3 text-left text-[13.5px] leading-snug hover:bg-muted"
                aria-pressed={updates}
              >
                <Tick on={updates} />
                <span>Send me product updates and tips by email.</span>
              </button>
            </div>
            <div className="mt-6 flex justify-end">
              <button
                type="button"
                disabled={!adult}
                onClick={() => setStep(2)}
                className={`${pill} bg-foreground text-background hover:bg-foreground/85`}
              >
                Continue
              </button>
            </div>
          </>
        ) : (
          <>
            <h2 id="welcome-title" className="mt-5 text-[22px] font-medium leading-tight tracking-[-0.01em]">
              What brings you to Jenvu?
            </h2>
            <p className="mt-2 text-[14px] text-muted-foreground">Pick one so we can point you to the right place first.</p>
            <div className="mt-5 space-y-2">
              {OPTIONS.map((o, i) => {
                const on = selected === i;
                return (
                  <button
                    type="button"
                    key={o.id}
                    onClick={() => setSelected(i)}
                    aria-pressed={on}
                    className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors ${
                      on ? "border-foreground bg-muted" : "border-border hover:bg-muted"
                    }`}
                  >
                    <span
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                        on ? "bg-foreground text-background" : "bg-muted text-foreground"
                      }`}
                    >
                      <o.Icon className="h-[18px] w-[18px]" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[14px] font-medium">{o.title}</span>
                      <span className="mt-0.5 block text-[12.5px] leading-snug text-muted-foreground">{o.desc}</span>
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="mt-6 flex items-center justify-between gap-3">
              <button
                type="button"
                disabled={saving}
                onClick={() => setStep(1)}
                className={`${pill} px-4 text-muted-foreground hover:bg-muted hover:text-foreground`}
              >
                Back
              </button>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => finish(null)}
                  className={`${pill} px-4 text-foreground hover:bg-muted`}
                >
                  Skip
                </button>
                <button
                  type="button"
                  disabled={selected === null || saving}
                  onClick={() => finish(OPTIONS[selected!].id)}
                  className={`${pill} bg-foreground text-background hover:bg-foreground/85`}
                >
                  {saving ? "Saving…" : "Get started"}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}
