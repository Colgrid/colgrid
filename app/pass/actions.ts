"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type MissionState = { error: string | null; stay: number | null; attempt: number };

const num = (form: FormData, key: string) => {
  const v = Number(form.get(key));
  return form.get(key) === null || form.get(key) === "" || !Number.isFinite(v) ? null : v;
};

// The in-app way to finish a stop: the database checks the phone is at the stop (location is used
// for the check and never stored) and/or that the team knows the on-site answer. Host codes on the
// Check in tab still work as a backup.
export async function completeMission(prev: MissionState, form: FormData): Promise<MissionState> {
  const questId = String(form.get("quest_id") ?? "");
  const answer = String(form.get("answer") ?? "").trim().slice(0, 80);
  const attempt = prev.attempt + 1;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("complete_mission", {
    p_quest_id: questId,
    p_answer: answer || null,
    p_lat: num(form, "lat"),
    p_lng: num(form, "lng"),
    p_accuracy: num(form, "accuracy"),
  });
  const r = (data ?? {}) as { status?: string; xp_before?: number; xp_after?: number; distance_m?: number; seconds_left?: number };
  const fail = (error: string) => ({ error, stay: null, attempt });
  if (error || !r.status) return fail("Something went wrong. Try again in a moment.");
  switch (r.status) {
    case "ok":
    case "already":
      revalidatePath("/pass");
      redirect(`/pass?complete=${Math.max(0, (r.xp_after ?? 0) - (r.xp_before ?? 0))}`);
    case "stay":
      return { error: null, stay: r.seconds_left ?? 30, attempt };
    case "too_far":
      return fail(`You're about ${r.distance_m ?? "?"} m away. Get to the spot and try again.`);
    case "need_location":
      return fail("We need your location to check you in here. Allow location for this site, then try again.");
    case "weak_signal":
      return fail("Your location is too fuzzy right now. Step outside or away from tall walls and try again.");
    case "wrong_answer":
      return fail("Not quite. Look again: the answer is out there.");
    case "too_many":
      return fail("Too many guesses. Take a breath and try again in a few minutes.");
    case "no_team":
      return fail("You're not on a team yet. Scan the start sign first.");
    default:
      return fail("That mission isn't open right now.");
  }
}
