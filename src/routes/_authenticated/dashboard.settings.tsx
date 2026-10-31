import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowUpRight, Check, Copy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SettingsCard, SettingsFlat, SettingsRow } from "@/components/settings/SettingsCard";
import { PreferencesSettings } from "@/components/settings/PreferencesSettings";
import { DangerZoneSettings } from "@/components/settings/SecuritySettings";
import { SETTINGS_PAGES } from "@/components/settings/SettingsNav";

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

const pillBtn =
  "inline-flex h-9 items-center justify-center gap-1.5 rounded-full border border-gc-line bg-background px-4 text-[14px] text-gc-ink hover:bg-gc-surface";

type GeneralUser = { id: string; email: string; name: string; created: string | null; provider: string };

function GeneralSettings() {
  const [user, setUser] = useState<GeneralUser | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => {
      const u = data.session?.user;
      if (!u) return;
      const provider = (u.app_metadata?.provider as string | undefined) ?? "email";
      const meta = (u.user_metadata ?? {}) as { full_name?: string; name?: string };
      setUser({ id: u.id, email: u.email ?? "", name: meta.full_name || meta.name || "", created: u.created_at ?? null, provider });
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

  const method = user ? (user.provider === "email" ? "Email and password" : user.provider.charAt(0).toUpperCase() + user.provider.slice(1)) : "—";
  const shortcuts = SETTINGS_PAGES.filter((p) => p.to !== "/dashboard/settings");

  return (
    <SettingsFlat>
      <div className="mx-auto w-full max-w-[930px] pb-10 pt-2 text-foreground">
        <h1 className="px-1 text-[28px] font-normal leading-tight tracking-tight text-gc-ink sm:px-2 sm:text-[32px]">General</h1>

        <div className="mt-8 space-y-10">
          <SettingsCard
            id="account"
            title="Main"
            action={<Link to="/dashboard/profile" className={pillBtn}>Edit profile</Link>}
          >
            <SettingsRow label="Account owner">
              <p className="truncate text-gc-ink">{user?.name || user?.email.split("@")[0] || "—"}</p>
              <p className="truncate text-[13px] text-gc-ink-muted">{user?.email || "—"}</p>
            </SettingsRow>
            <SettingsRow label="Sign-in method">{method}</SettingsRow>
            <SettingsRow label="Created">{fmtDate(user?.created)}</SettingsRow>
            <SettingsRow label="Account ID">
              <span className="inline-flex max-w-full items-center gap-3">
                <code className="break-all font-sans text-[13px] text-gc-ink">{user?.id ?? "—"}</code>
                <button
                  type="button"
                  onClick={() => void copyId()}
                  disabled={!user}
                  aria-label="Copy account ID"
                  className="shrink-0 text-gc-ink-muted hover:text-gc-ink disabled:opacity-50"
                >
                  {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
              </span>
            </SettingsRow>
            {shortcuts.map((p) => (
              <SettingsRow key={p.to} label={p.label}>
                <Link to={p.to as "/dashboard"} className="inline-flex items-center gap-1.5 text-gc-ink hover:underline">
                  Manage <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
              </SettingsRow>
            ))}
          </SettingsCard>

          <PreferencesSettings />

          <DangerZoneSettings />
        </div>
      </div>
    </SettingsFlat>
  );
}
