import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Check, ChevronRight, Copy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SettingsCard, SettingsRow, settingsBtn } from "@/components/settings/SettingsCard";
import { PreferencesSettings } from "@/components/settings/PreferencesSettings";
import { SETTINGS_PAGES, SettingsPageHeader } from "@/components/settings/SettingsNav";

export const Route = createFileRoute("/_authenticated/dashboard/settings")({
  head: () => ({
    meta: [
      { title: "Settings — Jenvu" },
      { name: "description", content: "General Jenvu account details and preferences." },
      { property: "og:title", content: "Settings — Jenvu" },
      { property: "og:description", content: "General Jenvu account details and preferences." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: GeneralSettings,
});

const fmtDate = (d?: string | null) => {
  if (!d) return "—";
  try { return new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }); } catch { return d; }
};

function GeneralSettings() {
  const [user, setUser] = useState<{ id: string; email: string; created: string | null; provider: string } | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => {
      const u = data.session?.user;
      if (!u) return;
      const provider = (u.app_metadata?.provider as string | undefined) ?? "email";
      setUser({ id: u.id, email: u.email ?? "", created: u.created_at ?? null, provider });
    });
  }, []);

  const copyId = async () => {
    if (!user) return;
    try {
      await navigator.clipboard.writeText(user.id);
      setCopied(true);
      toast.success("Copied");
      setTimeout(() => setCopied(false), 1800);
    } catch { toast.error("Copy failed"); }
  };

  const shortcuts = SETTINGS_PAGES.filter((p) => p.to !== "/dashboard/settings");

  return (
    <div className="mx-auto w-full max-w-[1100px] pb-10 text-foreground">
      <SettingsPageHeader title="General" description="Your account details and the choices this browser remembers." />

      <div className="mt-6 space-y-6">
        <SettingsCard id="account" title="Account" description="Basic details of the account you're signed in with.">
          <SettingsRow label="Email" hint={user?.email || "—"} />
          <SettingsRow label="Sign-in method" hint={user ? (user.provider === "email" ? "Email and password" : user.provider.charAt(0).toUpperCase() + user.provider.slice(1)) : "—"} />
          <SettingsRow label="Member since" hint={fmtDate(user?.created)} />
          <SettingsRow label="Account ID" hint={<code className="break-all font-sans text-[13px]">{user?.id ?? "—"}</code>}>
            <button type="button" onClick={() => void copyId()} disabled={!user} className={settingsBtn}>
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} Copy
            </button>
          </SettingsRow>
        </SettingsCard>

        <PreferencesSettings />

        <section className="console-card overflow-hidden">
          <p role="heading" aria-level={2} className="px-6 pt-6 text-[20px] font-medium leading-tight text-foreground sm:px-7">More settings</p>
          <div className="mt-3 divide-y divide-gc-line">
            {shortcuts.map((p) => (
              <Link key={p.to} to={p.to as "/dashboard"} className="flex items-center gap-3 px-6 py-4 text-[15px] text-foreground hover:bg-gc-notice sm:px-7">
                <p.icon className="h-[18px] w-[18px] shrink-0" strokeWidth={1.75} aria-hidden="true" />
                <span className="flex-1">{p.label}</span>
                <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
