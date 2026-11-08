import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { authSignInUrl, restoreSharedSession } from "@/lib/cross-domain-session";
import { opsStatus } from "@/lib/ops-gate.functions";
import { OpsStandaloneContext, OpsState, ops } from "@/components/ops/OpsPage";

/**
 * Opens an admin tool as its own Ops Console page (no dashboard menu/frame).
 * Needs the unlocked console first; tools that read customer data also need
 * the admin account signed in, which each tool checks again on the server.
 */
export function OpsStandalone({ children, needsAccount = true }: { children: ReactNode; needsAccount?: boolean }) {
  const status = useServerFn(opsStatus);
  const [state, setState] = useState<"checking" | "ready" | "signin">("checking");

  useEffect(() => {
    let alive = true;
    (async () => {
      let token: string | undefined;
      try {
        token = window.sessionStorage.getItem("jenvu_ops_token") ?? undefined;
      } catch {
        token = undefined;
      }
      try {
        const s = await status({ data: { token } });
        if (!s.unlocked) {
          window.location.replace("/ops-x9k2-7m4n");
          return;
        }
      } catch {
        window.location.replace("/ops-x9k2-7m4n");
        return;
      }
      if (needsAccount) {
        let { data } = await supabase.auth.getSession();
        if (!data.session) {
          await restoreSharedSession();
          ({ data } = await supabase.auth.getSession());
        }
        if (!data.session) {
          if (alive) setState("signin");
          return;
        }
      }
      if (alive) setState("ready");
    })();
    return () => {
      alive = false;
    };
  }, [needsAccount, status]);

  return (
    <OpsStandaloneContext.Provider value={true}>
      {state === "checking" && <div className="ops-console min-h-dvh w-full bg-background" />}
      {state === "signin" && (
        <OpsState
          title="Sign in with the admin account"
          description="This tool shows customer data, so the admin account must be signed in."
          action={
            <a href={authSignInUrl(window.location.pathname + window.location.search)} className={ops.btnPrimary}>
              Sign in
            </a>
          }
        />
      )}
      {state === "ready" && children}
    </OpsStandaloneContext.Provider>
  );
}
