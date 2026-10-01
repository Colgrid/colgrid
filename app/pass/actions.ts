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
  if (error || !r.status) return fail("Didn't work. Try again.");
  switch (r.status) {
    case "ok":
    case "already":
      revalidatePath("/pass");
      redirect(`/pass?complete=${Math.max(0, (r.xp_after ?? 0) - (r.xp_before ?? 0))}`);
    case "stay":
      return { error: null, stay: r.seconds_left ?? 30, attempt };
    case "too_far":
      return fail(`About ${r.distance_m ?? "?"} m away. Get closer.`);
    case "need_location":
      return fail("Turn on location to check in here.");
    case "weak_signal":
      return fail("Signal is weak. Step outside and try again.");
    case "wrong_answer":
      return fail("Not quite. Look again.");
    case "too_many":
      return fail("Too many tries. Wait a few minutes.");
    case "no_team":
      return fail("Check in at the start first.");
    default:
      return fail("That mission isn't open right now.");
  }
}

// Check in at the start: the phone must be inside the start pin's radius (no sign needed).
// The start code on the Check in tab still works as a backup.
export async function arriveHere(prev: MissionState, form: FormData): Promise<MissionState> {
  const sessionId = String(form.get("session_id") ?? "");
  const attempt = prev.attempt + 1;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("arrive_here", {
    p_session_id: sessionId,
    p_lat: num(form, "lat"),
    p_lng: num(form, "lng"),
    p_accuracy: num(form, "accuracy"),
  });
  const r = (data ?? {}) as { status?: string; xp_before?: number; xp_after?: number; distance_m?: number };
  const fail = (error: string) => ({ error, stay: null, attempt });
  if (error || !r.status) return fail("Didn't work. Try again.");
  switch (r.status) {
    case "arrived":
    case "already_here":
      revalidatePath("/pass");
      redirect(`/pass?complete=${Math.max(0, (r.xp_after ?? 0) - (r.xp_before ?? 0))}&kind=arrived`);
    case "too_far":
      return fail(`About ${r.distance_m ?? "?"} m away. Get closer.`);
    case "need_location":
      return fail("Turn on location to check in.");
    case "weak_signal":
      return fail("Signal is weak. Step outside and try again.");
    case "too_early":
      return fail("Check-in opens 30 minutes before the start.");
    case "not_revealed":
      return fail("The start isn't revealed yet.");
    case "not_live":
      return fail("This session has ended.");
    case "no_team":
      return fail("We can't find your ticket. Ask the crew.");
    default:
      return fail("Didn't work. Try again.");
  }
}
