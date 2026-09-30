"use server";

// Game master console actions. Each re-checks the crew role; the database enforces the same rules
// (staff-only functions and row-level security), and XP/badges only ever go up.
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireStaff } from "@/lib/admin/guard";
import { revealEmail, thanksEmail, type Recipient, type SessionInfo } from "@/lib/email/notices";
import { sendBatch } from "@/lib/email/resend";
import { planTeams } from "@/lib/game/teams";
import { rows } from "@/lib/rows";
import { safeNext } from "@/lib/safe-next";
import { formatWhen } from "@/lib/time";

function text(form: FormData, key: string, max = 200): string | null {
  const v = String(form.get(key) ?? "").trim().slice(0, max);
  return v === "" ? null : v;
}
function back(sessionId: string | null, msg: string): never {
  redirect(`/gm/${sessionId ?? ""}?msg=${encodeURIComponent(msg)}`);
}

type SessionRow = {
  id: string;
  number: number;
  season_id: string;
  neighborhood: string | null;
  starts_at: string | null;
  start_location: string | null;
  survey_url: string | null;
  season: { number: number; name: string | null } | null;
};

async function loadSession(supabase: Awaited<ReturnType<typeof requireStaff>>["supabase"], id: string) {
  const { data } = await supabase
    .from("session")
    .select("id, number, season_id, neighborhood, starts_at, start_location, survey_url, season:season_id (number, name)")
    .eq("id", id)
    .maybeSingle();
  return data as unknown as SessionRow | null;
}

function info(s: SessionRow): SessionInfo {
  const season = s.season?.number === 0 ? "Pilot " : "";
  return { label: `Colgrid ${season}Session ${String(s.number).padStart(2, "0")}`, neighborhood: s.neighborhood, when: formatWhen(s.starts_at) };
}

async function ticketHolders(supabase: Awaited<ReturnType<typeof requireStaff>>["supabase"], sessionId: string): Promise<Recipient[]> {
  const { data } = await supabase.from("ticket").select("player:player_id (email, name)").eq("session_id", sessionId);
  return rows<{ player: Recipient | null }>(data)
    .map((t) => t.player)
    .filter((p): p is Recipient => !!p);
}

// ---------------------------------------------------------------------------------------------
// Session status
// ---------------------------------------------------------------------------------------------
export async function startSession(form: FormData) {
  const { supabase } = await requireStaff();
  const id = text(form, "session_id", 64);
  if (!id) back(null, "Missing session.");
  const { data, error } = await supabase.rpc("gm_start_session", { p_session_id: id });
  revalidatePath(`/gm/${id}`);
  back(id, error ? "Couldn't start the session." : data === "live" ? "The session is live. Check-in is open." : `The session is ${data}.`);
}

export async function closeSession(form: FormData) {
  const { supabase } = await requireStaff();
  const id = text(form, "session_id", 64);
  if (!id) back(null, "Missing session.");
  if (form.get("confirm") !== "on") back(id, "Tick the box to confirm closing the session.");
  const { data, error } = await supabase.rpc("gm_close_session", { p_session_id: id });
  if (error) back(id, "Couldn't close the session.");
  const result = data as { status: string; badge?: string; awarded?: number };
  let msg = result.status === "closed" ? `Closed. ${result.awarded ?? 0} players got the ${result.badge} badge.` : "Already closed.";

  if (result.status === "closed" && form.get("send_thanks") === "on") {
    const session = await loadSession(supabase, id);
    // Only people who actually came get the thank-you.
    const { data: present } = await supabase.from("attendance").select("player:player_id (email, name)").eq("session_id", id);
    const recipients = rows<{ player: Recipient | null }>(present)
      .map((a) => a.player)
      .filter((p): p is Recipient => !!p);
    if (session && recipients.length) {
      const { sent, error: mailError } = await sendBatch(recipients.map((r) => thanksEmail(r, info(session), session.survey_url)));
      msg += mailError ? ` ${mailError}` : ` Thank-you email sent to ${sent.length}.`;
    }
  }
  revalidatePath(`/gm/${id}`);
  back(id, msg);
}

// ---------------------------------------------------------------------------------------------
// Location reveal
// ---------------------------------------------------------------------------------------------
export async function revealLocation(form: FormData) {
  const { supabase } = await requireStaff();
  const id = text(form, "session_id", 64);
  if (!id) back(null, "Missing session.");
  const session = await loadSession(supabase, id);
  if (!session) back(id, "Session not found.");
  const location = text(form, "start_location", 200) ?? session.start_location;
  if (!location) back(id, "Add the start location first.");

  const { error } = await supabase
    .from("session")
    .update({ start_location: location, revealed_at: new Date().toISOString() })
    .eq("id", id);
  if (error) back(id, "Couldn't reveal the location.");
  let msg = "Location revealed. Players see it on their pass now.";

  if (form.get("send_email") === "on") {
    const recipients = await ticketHolders(supabase, id);
    const { sent, error: mailError } = await sendBatch(recipients.map((r) => revealEmail(r, info(session), location)));
    msg += mailError ? ` ${mailError}` : ` Emailed ${sent.length} players.`;
  }
  revalidatePath(`/gm/${id}`);
  back(id, msg);
}

export async function saveSurvey(form: FormData) {
  const { supabase } = await requireStaff();
  const id = text(form, "session_id", 64);
  const url = text(form, "survey_url", 400);
  if (!id) back(null, "Missing session.");
  if (url && !/^https:\/\//i.test(url)) back(id, "The survey link should start with https://");
  const { error } = await supabase.from("session").update({ survey_url: url }).eq("id", id);
  revalidatePath(`/gm/${id}`);
  back(id, error ? "Couldn't save the survey link." : url ? "Survey link saved. Players see it on their pass after the session." : "Survey link removed.");
}

// ---------------------------------------------------------------------------------------------
// Teams and attendance
// ---------------------------------------------------------------------------------------------
export async function createTeam(form: FormData) {
  const { supabase } = await requireStaff();
  const id = text(form, "session_id", 64);
  const name = text(form, "name", 60);
  if (!id || !name) back(id, "Give the team a name.");
  const session = await loadSession(supabase, id);
  if (!session) back(id, "Session not found.");
  const { error } = await supabase.from("team").insert({ season_id: session.season_id, name });
  revalidatePath(`/gm/${id}`);
  back(id, error ? (error.code === "23505" ? "There's already a team with that name this season." : "Couldn't create the team.") : `Team "${name}" created.`);
}

export async function renameTeam(form: FormData) {
  const { supabase } = await requireStaff();
  const id = text(form, "session_id", 64);
  const teamId = text(form, "team_id", 64);
  const name = text(form, "name", 60);
  if (!teamId || !name) back(id, "Give the team a name.");
  const { error } = await supabase.from("team").update({ name }).eq("id", teamId);
  revalidatePath(`/gm/${id}`);
  back(id, error ? (error.code === "23505" ? "That name is taken this season." : "Couldn't rename the team.") : `Renamed to "${name}".`);
}

// Put a player on a team (or take them off). Only before they're marked present, so XP and
// attendance always match the team they played with.
export async function assignTeam(form: FormData) {
  const { supabase } = await requireStaff();
  const id = text(form, "session_id", 64);
  const playerId = text(form, "player_id", 64);
  const teamId = text(form, "team_id", 64);
  if (!id || !playerId) back(id, "Missing player.");
  const session = await loadSession(supabase, id);
  if (!session) back(id, "Session not found.");

  const { data: present } = await supabase.from("attendance").select("player_id").eq("session_id", id).eq("player_id", playerId);
  if (rows(present).length) back(id, "They're already checked in with their team, so they stay on it tonight.");

  const { data: seasonTeams } = await supabase.from("team").select("id").eq("season_id", session.season_id);
  const teamIds = rows<{ id: string }>(seasonTeams).map((t) => t.id);
  if (teamIds.length) await supabase.from("team_member").delete().eq("player_id", playerId).in("team_id", teamIds);
  if (teamId) {
    const { error } = await supabase.from("team_member").insert({ team_id: teamId, player_id: playerId });
    if (error) back(id, "Couldn't move them to that team.");
  }
  revalidatePath(`/gm/${id}`);
  back(id, teamId ? "Team updated." : "Removed from their team.");
}

// Make teams for everyone without one: orders stay together, solos fill in, max N per team.
export async function autoTeams(form: FormData) {
  const { supabase } = await requireStaff();
  const id = text(form, "session_id", 64);
  const size = Math.min(8, Math.max(2, Number(text(form, "size", 2) ?? 5) || 5));
  if (!id) back(null, "Missing session.");
  const session = await loadSession(supabase, id);
  if (!session) back(id, "Session not found.");

  const [{ data: ticketData }, { data: teamData }] = await Promise.all([
    supabase.from("ticket").select("player_id, order_ref").eq("session_id", id),
    supabase.from("team").select("id, name, team_member (player_id)").eq("season_id", session.season_id),
  ]);
  const teams = rows<{ id: string; name: string; team_member: { player_id: string }[] }>(teamData);
  const onTeam = new Set(teams.flatMap((t) => t.team_member.map((m) => m.player_id)));
  const unassigned = rows<{ player_id: string; order_ref: string | null }>(ticketData)
    .filter((t) => !onTeam.has(t.player_id))
    .map((t) => ({ id: t.player_id, order_ref: t.order_ref }));
  if (unassigned.length === 0) back(id, "Everyone already has a team.");

  const plan = planTeams(unassigned, size);
  const taken = new Set(teams.map((t) => t.name.toLowerCase()));
  let n = 1;
  for (const members of plan) {
    while (taken.has(`team ${String(n).padStart(2, "0")}`)) n++;
    const name = `Team ${String(n).padStart(2, "0")}`;
    taken.add(name.toLowerCase());
    const { data: team, error } = await supabase.from("team").insert({ season_id: session.season_id, name }).select("id").single();
    if (error || !team) back(id, "Couldn't create the teams.");
    const teamId = (team as { id: string }).id;
    const { error: memberError } = await supabase.from("team_member").insert(members.map((player_id) => ({ team_id: teamId, player_id })));
    if (memberError) back(id, "Couldn't fill the teams.");
  }
  revalidatePath(`/gm/${id}`);
  back(id, `Made ${plan.length} teams for ${unassigned.length} players. Rename them at the opening ritual.`);
}

export async function markPresent(form: FormData) {
  const { supabase } = await requireStaff();
  const id = text(form, "session_id", 64);
  const playerId = text(form, "player_id", 64);
  if (!id || !playerId) back(id, "Missing player.");
  const { data, error } = await supabase.rpc("gm_mark_present", { p_session_id: id, p_player_id: playerId });
  const status = (data as { status?: string } | null)?.status;
  revalidatePath(`/gm/${id}`);
  if (error) back(id, "Couldn't mark them present.");
  if (status === "no_team") back(id, "Put them on a team first.");
  if (status === "closed") back(id, "The session is closed.");
  back(id, status === "already" ? "Already here." : "Checked in (+50 XP).");
}

// ---------------------------------------------------------------------------------------------
// Judged challenges: points for tournament teams (casual teams are never scored or ranked)
// ---------------------------------------------------------------------------------------------
export async function scoreJudged(form: FormData) {
  const { supabase } = await requireStaff();
  const id = text(form, "session_id", 64);
  const questId = text(form, "quest_id", 64);
  const teamId = text(form, "team_id", 64);
  const raw = text(form, "points", 4);
  if (!id || !questId || !teamId || raw === null) back(id, "Enter a score.");
  const points = Math.max(0, Math.round(Number(raw)));
  if (!Number.isFinite(points)) back(id, "Enter a number.");
  const { data: q } = await supabase.from("quest").select("max_points").eq("id", questId).maybeSingle();
  const max = (q as { max_points: number | null } | null)?.max_points ?? 10;
  const { error } = await supabase
    .from("completion")
    .upsert({ quest_id: questId, team_id: teamId, points: Math.min(points, max) }, { onConflict: "quest_id,team_id" });
  revalidatePath(`/gm/${id}`);
  back(id, error ? "Couldn't save the score." : `Scored ${Math.min(points, max)}.`);
}

// Add one player by hand: comps, invited friends, walk-ins. Works like one row of the Eventbrite import.
export async function addPlayer(form: FormData) {
  const { supabase } = await requireStaff();
  const id = text(form, "session_id", 64);
  const returnTo = safeNext(text(form, "return_to", 200)) ?? `/gm/${id}`;
  const to = (msg: string): never => redirect(`${returnTo}${returnTo.includes("?") ? "&" : "?"}msg=${encodeURIComponent(msg)}`);
  if (!id) back(id, "Missing session.");
  const { data, error } = await supabase.rpc("add_player", {
    p_session_id: id,
    p_email: text(form, "email", 254),
    p_name: text(form, "name", 120),
    p_coming_with: text(form, "coming_with", 20),
  });
  const status = (data as { status?: string } | null)?.status;
  revalidatePath(returnTo.split("?")[0]);
  if (error) to("Couldn't add the player.");
  if (status === "bad_email") to("That email doesn't look right.");
  if (status === "closed") to("That session is closed.");
  to(status === "already" ? "They already have a ticket for this session." : "Player added. Send their welcome email from Import, or they can sign in at getcolgrid.com.");
}
