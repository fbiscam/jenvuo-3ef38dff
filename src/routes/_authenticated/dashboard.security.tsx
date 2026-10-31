import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SecuritySettings } from "@/components/settings/SecuritySettings";
import { ActiveSessionsSettings } from "@/components/settings/ActiveSessionsSettings";
import { SettingsPageHeader } from "@/components/settings/SettingsNav";

export const Route = createFileRoute("/_authenticated/dashboard/security")({
  head: () => ({
    meta: [
      { title: "Security settings — Jenvu" },
      { name: "description", content: "Password, two-step sign-in, email and active sessions for your Jenvu account." },
      { property: "og:title", content: "Security settings — Jenvu" },
      { property: "og:description", content: "Password, two-step sign-in, email and active sessions for your Jenvu account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SecurityPage,
});

function SecurityPage() {
  const [email, setEmail] = useState("");

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => setEmail(data.session?.user.email ?? ""));
    const hash = window.location.hash.replace("#", "");
    if (hash) setTimeout(() => document.getElementById(hash)?.scrollIntoView({ block: "start" }), 300);
  }, []);

  return (
    <div className="mx-auto w-full max-w-[1100px] pb-10 text-foreground">
      <SettingsPageHeader title="Security" description="Password, two-step sign-in, email and where you're signed in." />
      <div className="mt-6 space-y-6">
        <SecuritySettings email={email} />
        <ActiveSessionsSettings />
      </div>
    </div>
  );
}
