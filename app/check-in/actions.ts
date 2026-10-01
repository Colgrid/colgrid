"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { CheckInResult } from "@/lib/game/checkin";

export type CheckInState = { result: CheckInResult | null; code: string };

// Sends the code to the database's check_in(), which enforces every rule
// (once per team, XP to present teammates, points for tournament teams only, guess limits).
export async function submitCheckIn(_prev: CheckInState, formData: FormData): Promise<CheckInState> {
  const code = String(formData.get("code") ?? "").trim().slice(0, 16);
  if (!code) return { result: { status: "bad_code" }, code };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("check_in", { p_code: code });
  if (error || !data || typeof data !== "object") {
    console.error("check_in failed", error?.message);
    return { result: { status: "error" }, code };
  }

  revalidatePath("/pass");
  const r = data as CheckInResult;
  // A new check-in goes straight back to the pass for the mission-complete moment and the next mission.
  if (r.status === "ok" || r.status === "arrived") {
    const gained = Math.max(0, (r.xp_after ?? 0) - (r.xp_before ?? 0));
    const kind = r.status === "arrived" ? "arrived" : r.is_hidden ? "hidden" : "mission";
    redirect(`/pass?complete=${gained}&kind=${kind}`);
  }
  return { result: r, code };
}
