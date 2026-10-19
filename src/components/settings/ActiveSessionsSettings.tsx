import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Laptop, Smartphone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getIpGeo } from "@/lib/ip-geo";
import { signOutAndRedirect } from "@/lib/cross-domain-session";
import { SettingsCard, SettingsRow, settingsBtn } from "./SettingsCard";

function describeBrowser(ua: string) {
  const mobile = /Mobile|Android|iPhone|iPad/.test(ua);
  let browser = "Browser";
  if (/Edg\//.test(ua)) browser = "Edge";
  else if (/Chrome\//.test(ua)) browser = "Chrome";
  else if (/Firefox\//.test(ua)) browser = "Firefox";
  else if (/Safari\//.test(ua)) browser = "Safari";
  let os = "";
  if (/Windows/.test(ua)) os = "Windows";
  else if (/Android/.test(ua)) os = "Android";
  else if (/iPhone|iPad/.test(ua)) os = "iOS";
  else if (/Mac OS X/.test(ua)) os = "macOS";
  else if (/Linux/.test(ua)) os = "Linux";
  return { name: [browser, os].filter(Boolean).join(" on "), mobile };
}

const fmt = (d?: string | null) => {
  if (!d) return "—";
  try { return new Date(d).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }); } catch { return d; }
};

/** This browser's session, plus signing out here or everywhere else. */
export function ActiveSessionsSettings() {
  const [device, setDevice] = useState<{ name: string; mobile: boolean } | null>(null);
  const [place, setPlace] = useState<string | null>(null);
  const [signedInAt, setSignedInAt] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setDevice(describeBrowser(navigator.userAgent));
    void supabase.auth.getUser().then(({ data }) => setSignedInAt(data.user?.last_sign_in_at ?? null));
    void getIpGeo().then((g) => {
      if (g) setPlace([g.city, g.country_name].filter(Boolean).join(", ") || null);
    }).catch(() => {});
  }, []);

  const signOutOthers = async () => {
    setBusy(true);
    const { error } = await supabase.auth.signOut({ scope: "others" });
    setBusy(false);
    if (error) toast.error("Could not sign out other sessions");
    else toast.success("Signed out of all other browsers and devices");
  };

  const Icon = device?.mobile ? Smartphone : Laptop;

  return (
    <SettingsCard id="sessions" title="Active sessions" description="Where your Jenvu account is signed in.">
      <div className="flex items-center gap-4 px-6 py-5 sm:px-7">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gc-blue-soft text-gc-blue-deep">
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-2 text-[15px] font-medium text-gc-ink">
            {device?.name ?? "This browser"}
            <span className="rounded-full bg-gc-blue-soft px-2 py-0.5 text-[11px] font-medium text-gc-blue-deep">This browser</span>
          </p>
          <p className="mt-0.5 text-[13px] text-gc-ink-muted">
            {place ? `${place} · ` : ""}Signed in {fmt(signedInAt)}
          </p>
        </div>
        <button type="button" onClick={() => void signOutAndRedirect("/dashboard/profile")} className={settingsBtn}>
          Sign out
        </button>
      </div>
      <SettingsRow label="Sign out everywhere else" hint="Ends your session on every other browser, phone and the extension. You stay signed in here.">
        <button type="button" onClick={signOutOthers} disabled={busy} className={settingsBtn}>
          {busy ? "Signing out…" : "Sign out other sessions"}
        </button>
      </SettingsRow>
    </SettingsCard>
  );
}
