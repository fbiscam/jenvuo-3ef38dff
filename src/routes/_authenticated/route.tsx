import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAutoCloseTrades } from "@/hooks/useAutoCloseTrades";
import { verifyTrustedDevice } from "@/lib/trusted-devices.functions";

const TRUSTED_DEVICE_KEY = (uid: string) => `mfa_trusted_device:${uid}`;

async function hasValidTrustedDevice(uid: string): Promise<boolean> {
  if (typeof window === "undefined") return false;
  const token = window.localStorage.getItem(TRUSTED_DEVICE_KEY(uid));
  if (!token) return false;
  try {
    const res = await verifyTrustedDevice({ data: { token } });
    if (res?.valid) return true;
    window.localStorage.removeItem(TRUSTED_DEVICE_KEY(uid));
  } catch {
    // If the check fails, fall back to the normal MFA prompt instead of crashing.
  }
  return false;
}

function AuthenticatedLayout() {
  useAutoCloseTrades();
  return <Outlet />;
}

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      throw redirect({ to: "/auth", search: { redirect: location.href } });
    }

    const confirmedAt =
      (data.user as { email_confirmed_at?: string | null; confirmed_at?: string | null })
        .email_confirmed_at ??
      (data.user as { confirmed_at?: string | null }).confirmed_at;
    if (!confirmedAt) {
      await supabase.auth.signOut();
      throw redirect({ to: "/auth", search: { verify: "1" } as never });
    }

    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aal && aal.currentLevel === "aal1" && aal.nextLevel === "aal2") {
      if (await hasValidTrustedDevice(data.user.id)) return;
      throw redirect({ to: "/auth", search: { mfa: "1", redirect: location.href } as never });
    }
  },
  component: AuthenticatedLayout,
});
