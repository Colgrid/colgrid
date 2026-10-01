"use server";

import type { ShareKind } from "@/lib/share";
import { createClient } from "@/lib/supabase/server";

// Basic share counts: which moment, and what the player chose (opened, shared, saved, copied, cancelled).
// Best effort: a failed count never gets in the way of sharing.
export async function logShare(kind: ShareKind, action: "opened" | "shared" | "saved" | "copied" | "cancelled") {
  try {
    const supabase = await createClient();
    await supabase.rpc("log_share", { p_kind: kind, p_action: action });
  } catch {}
}
