import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

// Synchronously sniff localStorage for a stored Supabase session so the UI
// can render the correct auth state on the very first paint (no flash).
function readInitialUser(): { user: User | null; known: boolean } {
  if (typeof window === "undefined") return { user: null, known: false };
  try {
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (!k || !k.startsWith("sb-") || !k.endsWith("-auth-token")) continue;
      const raw = window.localStorage.getItem(k);
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      const u = parsed?.user ?? parsed?.currentSession?.user ?? null;
      return { user: u as User | null, known: true };
    }
    return { user: null, known: true };
  } catch {
    return { user: null, known: false };
  }
}

export function useAuthUser() {
  const initial = typeof window !== "undefined" ? readInitialUser() : { user: null, known: false };
  const [user, setUser] = useState<User | null>(initial.user);
  const [loading, setLoading] = useState(!initial.known);

  useEffect(() => {
    let alive = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!alive) return;
      setUser(data.session?.user ?? null);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((evt, session) => {
      if (evt === "SIGNED_OUT") {
        setUser(null);
        setLoading(false);
        return;
      }
      if (evt !== "SIGNED_IN" && evt !== "USER_UPDATED" && evt !== "INITIAL_SESSION" && evt !== "TOKEN_REFRESHED") return;
      setUser(session?.user ?? null);
      setLoading(false);
    });
    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return { user, loading };
}
