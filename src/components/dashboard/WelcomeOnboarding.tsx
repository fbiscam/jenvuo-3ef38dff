import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import welcomeImg from "@/assets/onboarding/welcome.jpg";
import signalsImg from "@/assets/onboarding/signals.jpg";
import aiImg from "@/assets/onboarding/ai-desk.jpg";
import extImg from "@/assets/onboarding/extension-api.jpg";
import demoImg from "@/assets/onboarding/demo.jpg";

const OPTIONS = [
  { id: "signals", title: "Trade XAU/USD with live SMC & ICT signals", desc: "Sweeps, supply & demand zones and fair value gaps on gold.", img: signalsImg },
  { id: "ai_desk", title: "Use the AI trading desk", desc: "Ask the chart copilot about structure, levels and news.", img: aiImg },
  { id: "extension_api", title: "Connect the extension & API", desc: "Bring Jenvu analysis into your browser and your own apps.", img: extImg },
  { id: "demo", title: "Practice on a demo account", desc: "Trade a $100,000 practice balance with no real money.", img: demoImg },
] as const;

const FONT = { fontFamily: "'Google Sans Flex','Google Sans',sans-serif" };
const NEW_ACCOUNT_MS = 3 * 24 * 60 * 60 * 1000;

/** Two-step onboarding shown once to newly signed-up users; the choice is saved on the account. */
export default function WelcomeOnboarding() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [adult, setAdult] = useState(false);
  const [updates, setUpdates] = useState(true);
  const [active, setActive] = useState(0);
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

  if (!open) return null;
  const preview = OPTIONS[selected ?? active];

  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto bg-background text-foreground" style={FONT}>
      <div className="mx-auto flex min-h-full max-w-6xl flex-col px-5 py-8 sm:px-10 sm:py-12">
        {step === 2 && (
          <div className="mb-8 flex gap-2">
            <span className="h-1 w-10 rounded-full bg-primary" />
            <span className="h-1 w-10 rounded-full bg-primary" />
          </div>
        )}
        <div className="grid flex-1 items-center gap-10 md:grid-cols-2">
          {step === 1 ? (
            <div className="max-w-md">
              <h1 className="text-3xl font-normal sm:text-4xl">Welcome to Jenvu</h1>
              <p className="mt-4 text-base text-muted-foreground">
                Your desk for gold: live XAU/USD charts, SMC & ICT tools, an AI copilot and a practice account — all in one place.
              </p>
              <label className="mt-8 flex cursor-pointer items-start gap-3 text-sm">
                <input type="checkbox" checked={adult} onChange={(e) => setAdult(e.target.checked)} className="mt-0.5 h-4 w-4 accent-primary" />
                <span>I confirm I am 18 or older and understand trading carries risk.</span>
              </label>
              <label className="mt-4 flex cursor-pointer items-start gap-3 text-sm">
                <input type="checkbox" checked={updates} onChange={(e) => setUpdates(e.target.checked)} className="mt-0.5 h-4 w-4 accent-primary" />
                <span>Send me product updates and tips by email.</span>
              </label>
              <button
                disabled={!adult}
                onClick={() => setStep(2)}
                className="mt-10 rounded-full bg-primary px-8 py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-40"
              >
                Continue
              </button>
            </div>
          ) : (
            <div>
              <h1 className="text-3xl font-normal sm:text-4xl">What brings you to Jenvu?</h1>
              <p className="mt-3 text-muted-foreground">Pick one so we can point you to the right place first.</p>
              <div className="mt-8 space-y-3">
                {OPTIONS.map((o, i) => (
                  <button
                    key={o.id}
                    onMouseEnter={() => setActive(i)}
                    onFocus={() => setActive(i)}
                    onClick={() => setSelected(i)}
                    className={`w-full rounded-2xl border px-5 py-4 text-left transition-colors ${
                      selected === i ? "border-primary bg-primary/10" : "border-border hover:bg-muted"
                    }`}
                  >
                    <div className="text-[15px] font-medium">{o.title}</div>
                    <div className="mt-1 text-sm text-muted-foreground">{o.desc}</div>
                  </button>
                ))}
              </div>
              <div className="mt-8 flex items-center justify-end gap-3">
                <button disabled={saving} onClick={() => finish(null)} className="rounded-full px-5 py-2.5 text-sm text-primary hover:bg-muted">
                  Skip
                </button>
                <button
                  disabled={selected === null || saving}
                  onClick={() => finish(OPTIONS[selected!].id)}
                  className="rounded-full bg-primary px-8 py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-40"
                >
                  {saving ? "Saving…" : "Continue →"}
                </button>
              </div>
            </div>
          )}
          <div className="hidden md:block">
            <img
              key={step === 1 ? "welcome" : preview.id}
              src={step === 1 ? welcomeImg : preview.img}
              alt=""
              width={1024}
              height={1024}
              className="aspect-square w-full rounded-3xl object-cover shadow-xl animate-in fade-in duration-300"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
