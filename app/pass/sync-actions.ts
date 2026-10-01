"use server";

import { revalidatePath } from "next/cache";
import type { Pending } from "@/lib/offline-queue";
import { createClient } from "@/lib/supabase/server";

export type SyncResult = { status?: string; gained: number; kind: "mission" | "hidden" | "arrived"; seconds_left?: number };

// Sends one check-in that waited on the phone while there was no signal. Same database calls as the
// live screens, so the same rules apply and nothing is ever counted twice.
export async function syncPending(p: Pending): Promise<SyncResult> {
  const supabase = await createClient();
  const call =
    p.kind === "code"
      ? supabase.rpc("check_in", { p_code: p.code })
      : p.kind === "mission"
        ? supabase.rpc("complete_mission", { p_quest_id: p.questId, p_answer: p.answer, p_lat: p.lat, p_lng: p.lng, p_accuracy: p.accuracy })
        : supabase.rpc("arrive_here", { p_session_id: p.sessionId, p_lat: p.lat, p_lng: p.lng, p_accuracy: p.accuracy });
  const { data, error } = await call;
  if (error || !data) return { gained: 0, kind: "mission" };
  const r = data as { status?: string; xp_before?: number; xp_after?: number; is_hidden?: boolean; seconds_left?: number };
  revalidatePath("/pass");
  return {
    status: r.status,
    gained: Math.max(0, (r.xp_after ?? 0) - (r.xp_before ?? 0)),
    kind: p.kind === "arrive" || r.status === "arrived" ? "arrived" : r.is_hidden ? "hidden" : "mission",
    seconds_left: r.seconds_left,
  };
}
