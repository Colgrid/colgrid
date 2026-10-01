// Open-route test counts for admin. Pure so it can be tested.

type Event = { kind: string; team_id: string | null; player_id: string | null; quest_id: string | null };

export function routeStats(
  events: Event[],
  completions: { team_id: string; quest_id: string }[],
  present: { player_id: string; team_id: string }[],
  mainStops: number,
): [string, string][] {
  const count = (kind: string) => events.filter((e) => e.kind === kind).length;
  const doneByTeam = new Map<string, number>();
  for (const c of completions) doneByTeam.set(c.team_id, (doneByTeam.get(c.team_id) ?? 0) + 1);
  const finishedTeams = [...doneByTeam.values()].filter((n) => mainStops > 0 && n >= mainStops).length;
  const startedTeams = new Set(events.filter((e) => e.kind === "route_start").map((e) => e.team_id)).size;
  const playingTeams = new Set(present.map((p) => p.team_id)).size;
  const sentBy = new Set(events.filter((e) => e.kind === "invite_sent").map((e) => e.player_id)).size;
  return [
    ["Route page visits", String(count("route_view"))],
    ["Sign-ups from this route", String(count("signup"))],
    ["Teams created", String(count("team_created"))],
    ["Teams that started the route", String(startedTeams)],
    ["Invites sent (taps on Invite friends)", `${count("invite_sent")} by ${sentBy} ${sentBy === 1 ? "player" : "players"}`],
    ["Invites accepted", String(count("invite_accepted"))],
    ["Quest starts (a team opened a stop)", String(count("quest_start"))],
    ["Quest completions", String(completions.length)],
    ["Teams that finished a stop", String(playingTeams)],
    ["Players who played (finished a stop)", String(present.length)],
    ["Route completions (teams)", String(finishedTeams)],
    ["Install card shown / installed (Android) / opened from home screen", `${count("install_shown")} / ${count("install_accepted")} / ${count("installed_open")}`],
  ];
}
