// Loads everything the player pass shows, as the signed-in player (row-level security applies).
// Players never read sessions or quests directly: they go through player_sessions() and
// player_quests(), which keep hidden quests and unrevealed locations hidden (CLAUDE.md rule 6).
import { createClient } from "@/lib/supabase/server";
import { pickSessions, questViews, type PassQuest, type PassSession, type QuestView, type SessionPick } from "@/lib/game/pass";

export type PlayMode = "casual" | "tournament";

// Guided mode: this player's team route and the finale (my_guided()).
export type Guided = {
  arrived: boolean;
  slot: number | null;
  mission_started_at: string | null;
  finale_name: string | null;
  finale_where: string | null;
  finale_at: string | null;
};

export type PassBadge = { key: string; name: string; description: string | null; earned: boolean };

export type PassData =
  | { kind: "no-pass"; email: string; isStaff: boolean; isAdmin: boolean }
  | {
      kind: "pass";
      email: string;
      isStaff: boolean;
      isAdmin: boolean;
      player: { id: string; name: string };
      totalXp: number;
      team: { id: string; name: string; mode: PlayMode } | null;
      chapter: { number: number; city: string } | null;
      season: { id: string; number: number } | null;
      sessions: SessionPick;
      sessionCount: number;
      // The session whose quests the pass shows: the live one, else the last one played.
      focus: { session: PassSession; quests: QuestView[]; guided: Guided | null } | null;
      // Tournament teams only. Casual teams are never ranked (CLAUDE.md rule 1).
      standing: { rank: number; points: number; teamCount: number } | null;
      badges: PassBadge[];
      sessionsAttended: number;
      hiddenFound: number;
    };

// Supabase rows come back untyped (no generated types yet); this names the shape we selected.
function rows<T>(data: unknown): T[] {
  return Array.isArray(data) ? (data as T[]) : [];
}

const BADGE_ORDER = ["founding", "session-01", "session-02", "session-03", "session-04", "full-season", "maker", "scout", "two-city", "chapter-champion"];
function badgeOrder(key: string): number {
  const i = BADGE_ORDER.indexOf(key);
  return i === -1 ? BADGE_ORDER.length : i;
}

type TeamRow ={ id: string; name: string; mode: PlayMode; season_id: string };
type SeasonRow = { id: string; number: number; chapter: { number: number; city: string } | null };

export async function loadPass(): Promise<PassData | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const email = user.email ?? "";
  const [{ data: claimed }, { data: staffRows }] = await Promise.all([
    // Returns the player's id, linking their ticket by email on first sign-in.
    supabase.rpc("claim_my_pass"),
    supabase.from("staff").select("role").eq("user_id", user.id),
  ]);
  const staff = rows<{ role: string }>(staffRows);
  const isStaff = staff.length > 0;
  const isAdmin = staff.some((s) => s.role === "admin");
  const playerId = typeof claimed === "string" ? claimed : null;
  if (!playerId) return { kind: "no-pass", email, isStaff, isAdmin };

  const [playerRes, xpRes, memberRes, seasonRes, badgeRes, myBadgeRes, hiddenRes, attendanceRes] = await Promise.all([
    supabase.from("player").select("id, name").eq("id", playerId).single(),
    supabase.from("player_xp_total").select("total_xp").eq("player_id", playerId).maybeSingle(),
    supabase
      .from("team_member")
      .select("joined_at, team:team_id (id, name, mode, season_id)")
      .eq("player_id", playerId)
      .order("joined_at", { ascending: false }),
    supabase.from("season").select("id, number, chapter:chapter_id (number, city)").order("number", { ascending: false }),
    supabase.from("badge").select("key, name, description, id"),
    supabase.from("player_badge").select("badge_id").eq("player_id", playerId),
    supabase.from("xp_event").select("id", { count: "exact", head: true }).eq("player_id", playerId).eq("reason", "hidden_quest"),
    supabase.from("attendance").select("session_id").eq("player_id", playerId),
  ]);

  const player = playerRes.data as unknown as { id: string; name: string } | null;
  if (!player) return { kind: "no-pass", email, isStaff, isAdmin };

  const totalXp = Number((xpRes.data as unknown as { total_xp: number } | null)?.total_xp ?? 0);

  const memberships = rows<{ team: TeamRow | null }>(memberRes.data);
  const team = memberships.find((m) => m.team)?.team ?? null;

  const seasons = rows<SeasonRow>(seasonRes.data);
  const seasonRow = (team && seasons.find((s) => s.id === team.season_id)) || seasons[0] || null;

  const earnedIds = new Set(rows<{ badge_id: string }>(myBadgeRes.data).map((b) => b.badge_id));
  const badges: PassBadge[] = rows<{ id: string; key: string; name: string; description: string | null }>(badgeRes.data)
    .map((b) => ({ key: b.key, name: b.name, description: b.description, earned: earnedIds.has(b.id) }))
    // Earned first, then in the order a season unfolds.
    .sort((a, b) => Number(b.earned) - Number(a.earned) || badgeOrder(a.key) - badgeOrder(b.key) || a.name.localeCompare(b.name));

  let sessionList: PassSession[] = [];
  let standing: Extract<PassData, { kind: "pass" }>["standing"] = null;

  if (seasonRow) {
    const [sessionsRes, standingsRes] = await Promise.all([
      supabase.rpc("player_sessions", { p_season_id: seasonRow.id }),
      team?.mode === "tournament" ? supabase.rpc("season_standings", { p_season_id: seasonRow.id }) : Promise.resolve(null),
    ]);
    sessionList = rows<PassSession>(sessionsRes.data);

    if (team?.mode === "tournament" && standingsRes) {
      const table = rows<{ rank: number; team_id: string; points: number }>(standingsRes.data);
      const mine = table.find((r) => r.team_id === team.id);
      if (mine) standing = { rank: Number(mine.rank), points: Number(mine.points), teamCount: table.length };
    }
  }

  const sessions = pickSessions(sessionList);
  const focusSession = sessions.live ?? sessions.last;
  let focus: Extract<PassData, { kind: "pass" }>["focus"] = null;
  if (focusSession && focusSession.status !== "scheduled") {
    const [{ data }, { data: guidedData }] = await Promise.all([
      supabase.rpc("player_quests", { p_session_id: focusSession.id }),
      supabase.rpc("my_guided", { p_session_id: focusSession.id }),
    ]);
    const guided = (guidedData as Guided | null) ?? null;
    focus = { session: focusSession, quests: questViews(rows<PassQuest>(data), focusSession.status, guided?.slot ?? null), guided };
  }

  const seasonSessionIds = new Set(sessionList.map((s) => s.id));
  const sessionsAttended = rows<{ session_id: string }>(attendanceRes.data).filter((a) => seasonSessionIds.has(a.session_id)).length;

  return {
    kind: "pass",
    email,
    isStaff,
    isAdmin,
    player,
    totalXp,
    team: team ? { id: team.id, name: team.name, mode: team.mode } : null,
    chapter: seasonRow?.chapter ?? null,
    season: seasonRow ? { id: seasonRow.id, number: seasonRow.number } : null,
    sessions,
    sessionCount: sessionList.length,
    focus,
    standing,
    badges,
    sessionsAttended,
    hiddenFound: hiddenRes.count ?? 0,
  };
}
