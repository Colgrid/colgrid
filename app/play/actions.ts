"use server";

import { redirect } from "next/navigation";
import { isInviteToken, isRouteSlug } from "@/lib/routes";
import { createClient } from "@/lib/supabase/server";

const back = (path: string, msg: string): never => redirect(`${path}?msg=${msg}`);

// "Start with friends": sign up if new (just a first name), name the team (or use yours), go.
export async function startRoute(form: FormData) {
  const slug = String(form.get("slug") ?? "");
  const sessionId = String(form.get("session_id") ?? "");
  if (!isRouteSlug(slug)) redirect("/pass");
  const page = `/play/${slug}`;
  const supabase = await createClient();
  const name = String(form.get("name") ?? "").trim();
  if (form.has("name")) {
    if (!name) back(page, "name");
    const { data: player } = await supabase.rpc("join_colgrid", { p_name: name, p_session_id: sessionId });
    if (!player) back(page, "error");
  }
  const { data } = await supabase.rpc("start_route", { p_session_id: sessionId, p_team_name: String(form.get("team") ?? "") });
  const status = (data as { status?: string } | null)?.status;
  if (status === "ok") redirect("/pass");
  back(page, status === "name_taken" ? "taken" : status === "need_name" ? "team" : status === "not_open" ? "closed" : "error");
}

// Joining a friend's team from their link.
export async function joinTeam(form: FormData) {
  const token = String(form.get("token") ?? "");
  if (!isInviteToken(token)) redirect("/pass");
  const page = `/join/${token}`;
  const supabase = await createClient();
  if (form.has("name")) {
    const name = String(form.get("name") ?? "").trim();
    if (!name) back(page, "name");
    const { data: player } = await supabase.rpc("join_colgrid", { p_name: name, p_session_id: String(form.get("session_id") ?? "") || null });
    if (!player) back(page, "error");
  }
  const { data } = await supabase.rpc("join_team", { p_token: token });
  const status = (data as { status?: string } | null)?.status;
  if (status === "ok") redirect("/pass");
  back(page, status === "on_other_team" ? "other" : status === "closed" ? "closed" : "error");
}
