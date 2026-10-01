"use server";

import { createClient } from "@/lib/supabase/server";

const KINDS = ["invite_sent", "install_shown", "install_accepted", "installed_open"] as const;

// Test counts from the phone (open routes). Best effort: a failed count never bothers the player.
export async function logPlay(kind: (typeof KINDS)[number], sessionId: string | null = null): Promise<void> {
  if (!KINDS.includes(kind)) return;
  try {
    const supabase = await createClient();
    await supabase.rpc("log_play", { p_kind: kind, p_session_id: sessionId });
  } catch {
    // ignore
  }
}
