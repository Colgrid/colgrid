"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type AnswerState = { error: string | null };

// Puzzle stops: the team types what they found. The database checks it (answers never reach the
// phone) and counts a right answer exactly like a host code.
export async function answerMission(_prev: AnswerState, form: FormData): Promise<AnswerState> {
  const questId = String(form.get("quest_id") ?? "");
  const answer = String(form.get("answer") ?? "").trim().slice(0, 80);
  if (!answer) return { error: "Type what you found." };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("answer_mission", { p_quest_id: questId, p_answer: answer });
  const r = (data ?? {}) as { status?: string; xp_before?: number; xp_after?: number };
  if (error || !r.status) return { error: "Something went wrong. Try again in a moment." };
  if (r.status === "wrong_answer") return { error: "Not quite. Look again: the answer is out there." };
  if (r.status === "too_many") return { error: "Too many guesses. Take a breath and try again in a few minutes." };
  if (r.status !== "ok" && r.status !== "already") return { error: "That mission isn't open right now." };
  revalidatePath("/pass");
  redirect(`/pass?complete=${Math.max(0, (r.xp_after ?? 0) - (r.xp_before ?? 0))}`);
}
