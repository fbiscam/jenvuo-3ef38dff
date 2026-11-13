// Tiny per-user browser snapshot so dashboard pages paint instantly with the
// last known data while a fresh copy loads in the background.
import { supabase } from "@/integrations/supabase/client";

const PREFIX = "jenvu:page-cache:";

async function userId(): Promise<string | null> {
  try {
    const { data } = await supabase.auth.getSession();
    return data.session?.user?.id ?? null;
  } catch {
    return null;
  }
}

export async function readPageCache<T>(name: string): Promise<T | null> {
  if (typeof window === "undefined") return null;
  const uid = await userId();
  if (!uid) return null;
  try {
    const raw = window.localStorage.getItem(`${PREFIX}${name}:${uid}`);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export async function writePageCache<T>(name: string, value: T): Promise<void> {
  if (typeof window === "undefined") return;
  const uid = await userId();
  if (!uid) return;
  try {
    window.localStorage.setItem(`${PREFIX}${name}:${uid}`, JSON.stringify(value));
  } catch {
    /* storage full or blocked */
  }
}
