"use server";

// Admin actions for paid challenges: settings, photo review, rewards. Each one checks the admin
// again (actions are public endpoints); the database enforces the same rule underneath.
// These need the challenges migration (20261002000020) applied.
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin/guard";

function text(form: FormData, key: string, max = 200): string | null {
  const v = String(form.get(key) ?? "").trim().slice(0, max);
  return v === "" ? null : v;
}
// "10" or "10.50" dollars -> cents. Blank or not a number -> null.
function cents(form: FormData, key: string): number | null {
  const v = text(form, key, 12);
  if (v === null) return null;
  const n = Number(v.replace(/[$,]/g, ""));
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : null;
}
function back(sessionId: string, msg: string): never {
  revalidatePath(`/admin/sessions/${sessionId}/challenge`);
  redirect(`/admin/sessions/${sessionId}/challenge?msg=${encodeURIComponent(msg)}`);
}

export async function saveChallenge(form: FormData) {
  const { supabase } = await requireAdmin();
  const id = String(form.get("id") ?? "");
  const minAsks = Number(text(form, "base_reward_min_asks", 4));
  const { error } = await supabase
    .from("session")
    .update({
      is_challenge: form.get("is_challenge") === "on",
      client_name: text(form, "client_name", 120),
      client_objective: text(form, "client_objective", 500),
      base_reward_cents: Math.min(50000, cents(form, "base_reward") ?? 0),
      base_reward_form: form.get("base_reward_form") === "cash" ? "cash" : "gift_card",
      base_reward_min_asks: Number.isFinite(minAsks) && minAsks > 0 ? Math.round(minAsks) : null,
    })
    .eq("id", id);
  back(id, error ? "Couldn't save the challenge settings." : "Challenge settings saved.");
}

export async function saveAsk(form: FormData) {
  const { supabase } = await requireAdmin();
  const sessionId = String(form.get("session_id") ?? "");
  const sponsor = cents(form, "sponsor_reward");
  const { error } = await supabase
    .from("quest")
    .update({
      needs_photo: form.get("needs_photo") === "on",
      sponsor_name: text(form, "sponsor_name", 120),
      sponsor_reward_cents: sponsor && sponsor > 0 ? Math.min(50000, sponsor) : null,
    })
    .eq("id", String(form.get("quest_id") ?? ""));
  back(sessionId, error ? "Couldn't save that ask." : "Ask saved.");
}

export async function reviewPhoto(form: FormData) {
  const { supabase } = await requireAdmin();
  const sessionId = String(form.get("session_id") ?? "");
  const approve = form.get("decision") === "approve";
  const { error } = await supabase.rpc("review_photo", { p_photo_id: String(form.get("photo_id") ?? ""), p_approve: approve, p_note: null });
  back(sessionId, error ? "Couldn't save that review." : approve ? "Photo approved." : "Photo rejected.");
}

export async function awardRewards(form: FormData) {
  const { supabase } = await requireAdmin();
  const sessionId = String(form.get("session_id") ?? "");
  const { data, error } = await supabase.rpc("award_challenge_rewards", { p_session_id: sessionId });
  const n = Number(data ?? 0);
  back(sessionId, error ? "Couldn't work out rewards." : n === 0 ? "No new rewards. Everyone who has earned one is already on the list." : `${n} new reward${n === 1 ? "" : "s"} added.`);
}

export async function setRewardStatus(form: FormData) {
  const { supabase } = await requireAdmin();
  const sessionId = String(form.get("session_id") ?? "");
  const status = String(form.get("status") ?? "");
  if (!["earned", "sent", "claimed", "void"].includes(status)) back(sessionId, "Unknown status.");
  const { error } = await supabase.rpc("set_reward_status", { p_reward_id: String(form.get("reward_id") ?? ""), p_status: status, p_note: text(form, "note", 300) });
  back(sessionId, error ? "Couldn't update that reward." : `Marked ${status}.`);
}

export async function addPerformanceReward(form: FormData) {
  const { supabase } = await requireAdmin();
  const sessionId = String(form.get("session_id") ?? "");
  const amount = cents(form, "amount");
  const playerId = String(form.get("player_id") ?? "");
  if (!amount || amount <= 0 || !playerId) back(sessionId, "Pick a participant and an amount.");
  const { error } = await supabase.rpc("add_performance_reward", {
    p_session_id: sessionId,
    p_player_id: playerId,
    p_amount_cents: amount,
    p_form: form.get("form") === "cash" ? "cash" : "gift_card",
    p_note: text(form, "note", 300),
  });
  back(sessionId, error ? "Couldn't add that reward." : "Performance reward added.");
}
