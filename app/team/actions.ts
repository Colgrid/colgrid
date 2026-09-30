"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { SITE } from "@/lib/site";
import { createClient } from "@/lib/supabase/server";

// Switch how the team plays. The database enforces the rules (docs/game-design.md):
// any teammate can opt into the tournament until the season's 2nd session starts;
// dropping back to casual is always allowed.
export async function setTeamMode(form: FormData) {
  const teamId = String(form.get("team_id") ?? "");
  if (!SITE.tournamentOpen) redirect("/team"); // the tournament is paused
  const mode = form.get("mode") === "tournament" ? "tournament" : "casual";
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_team_mode", { p_team_id: teamId, p_mode: mode });
  revalidatePath("/team");
  revalidatePath("/pass");
  const msg = error
    ? error.code === "23514"
      ? "Tournament sign-up is closed for this season. Your team plays casual."
      : "Couldn't change how your team plays."
    : mode === "tournament"
      ? "You're in the tournament. Your team now earns points and shows on the standings."
      : "Your team plays casual. No ranking.";
  redirect(`/team?msg=${encodeURIComponent(msg)}`);
}
