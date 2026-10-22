import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ALERT_SOUND_OPTIONS, getAlertSoundPref, setAlertSoundPref, type AlertSoundKey } from "@/lib/alert-sound";
import { cn } from "@/lib/utils";
import { SettingsCard, SettingsRow } from "./SettingsCard";

const TERMINAL_SETTINGS_KEY = "jenvu:terminal:settings:v1";
const CHART_STYLE_KEY = "jenvu:terminal-chart-style";

function Segmented<T extends string>({ value, options, onChange, label }: { value: T; options: { key: T; label: string }[]; onChange: (v: T) => void; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-full border border-gc-line bg-gc-surface p-1">
      {options.map((o) => (
        <button
          key={o.key}
          type="button"
          role="radio"
          aria-checked={value === o.key}
          onClick={() => onChange(o.key)}
          className={cn(
            "h-8 rounded-full px-4 text-[13px] font-medium transition-colors",
            value === o.key ? "bg-background text-gc-blue-deep shadow-sm" : "text-gc-ink-muted hover:text-gc-ink",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Choices this browser remembers: Terminal theme, chart style and alert sound. */
export function PreferencesSettings() {
  const [theme, setTheme] = useState<"dark" | "light">("light");
  const [chartStyle, setChartStyle] = useState<"area" | "candles">("area");
  const [sound, setSound] = useState<AlertSoundKey>("chime");

  useEffect(() => {
    try {
      const s = JSON.parse(localStorage.getItem(TERMINAL_SETTINGS_KEY) || "null");
      if (s?.pickedLook === "dark" || s?.pickedLook === "light") setTheme(s.pickedLook);
      if (JSON.parse(localStorage.getItem(CHART_STYLE_KEY) || "null") === "candles") setChartStyle("candles");
    } catch { /* keep defaults */ }
    setSound(getAlertSoundPref());
  }, []);

  const saveTheme = (next: "dark" | "light") => {
    setTheme(next);
    try {
      const s = JSON.parse(localStorage.getItem(TERMINAL_SETTINGS_KEY) || "null") ?? {};
      localStorage.setItem(TERMINAL_SETTINGS_KEY, JSON.stringify({ ...s, theme: next, look: next, pickedLook: next }));
      toast.success("Terminal theme saved");
    } catch { /* ignore */ }
  };

  const saveChartStyle = (next: "area" | "candles") => {
    setChartStyle(next);
    try {
      localStorage.setItem(CHART_STYLE_KEY, JSON.stringify(next));
      toast.success("Chart style saved");
    } catch { /* ignore */ }
  };

  const saveSound = (next: AlertSoundKey) => {
    setSound(next);
    setAlertSoundPref(next);
    toast.success("Alert sound saved");
  };

  return (
    <SettingsCard id="preferences" title="Preferences" description="How Jenvu looks and sounds on this browser.">
      <SettingsRow label="Terminal theme" hint="The look the Terminal opens with.">
        <Segmented label="Terminal theme" value={theme} onChange={saveTheme} options={[{ key: "dark", label: "Dark" }, { key: "light", label: "Light" }]} />
      </SettingsRow>
      <SettingsRow label="Chart style" hint="Line or candles on the Terminal chart.">
        <Segmented label="Chart style" value={chartStyle} onChange={saveChartStyle} options={[{ key: "area", label: "Line" }, { key: "candles", label: "Candles" }]} />
      </SettingsRow>
      <SettingsRow label="Alert sound" hint={ALERT_SOUND_OPTIONS.find((o) => o.key === sound)?.description}>
        <Segmented label="Alert sound" value={sound} onChange={saveSound} options={ALERT_SOUND_OPTIONS.map((o) => ({ key: o.key, label: o.label }))} />
      </SettingsRow>
    </SettingsCard>
  );
}
