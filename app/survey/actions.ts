"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const FIELDS = ["enjoyed", "easy", "quests_fun", "best_quest_id", "worst_quest_id", "neighborhood", "web_pass", "again", "recommend", "change_one", "comment"];

export async function submitSurvey(form: FormData) {
  const id = String(form.get("session_id") ?? "");
  const answers: Record<string, string> = {};
  for (const f of FIELDS) {
    const v = form.get(f);
    if (typeof v === "string" && v.trim()) answers[f] = v.slice(0, 1000);
  }
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("submit_survey", { p_session_id: id, p: answers });
  if (error) redirect(`/survey/${id}?msg=error`);
  redirect(`/survey/${id}?msg=${data === "ok" ? "thanks" : data === "empty" ? "empty" : "error"}`);
}
