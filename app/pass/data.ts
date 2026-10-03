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
  // Open routes (self-guided): no start gate, a route name, the team's invite link.
  open_route?: boolean;
  route_name?: string | null;
  slug?: string | null;
  open_until?: string | null;
  invite?: string | null;
};

// Open routes anyone can play right now (open_routes()).
export type OpenRoute = { slug: string; route_name: string; neighborhood: string | null; stops: number; open_until: string; my_started: boolean; my_done: boolean };

export type PassBadge = { key: string; name: string; description: string | null; earned: boolean; earnedAt: string | null };

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
      // photoAsks: ask id -> photos this team has sent, for asks that need a photo (my_photo_asks()).
      focus: { session: PassSession; quests: QuestView[]; guided: Guided | null; photoAsks: Record<string, number> } | null;
      // Tournament teams only. Casual teams are never ranked (CLAUDE.md rule 1).
      standing: { rank: number; points: number; teamCount: number } | null;
      badges: PassBadge[];
      sessionsAttended: number;
      hiddenFound: number;
      // Open routes to play (shown when there's no team yet, or after finishing a route).
      routes: OpenRoute[];
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
    // Returns the player's id, linking the account to its player pass by email on first sign-in.
    supabase.rpc("claim_my_pass"),
    supabase.from("staff").select("role").eq("user_id", user.id),
  ]);
  const staff = rows<{ role: string }>(staffRows);
  const isStaff = staff.length > 0;
  const isAdmin = staff.some((s) => s.role === "admin");
  const playerId = typeof claimed === "string" ? claimed : null;
  if (!playerId) return { kind: "no-pass", email, isStaff, isAdmin };

  const [playerRes, xpRes, memberRes, seasonRes, badgeRes, myBadgeRes, hiddenRes, attendanceRes, passSeasonRes] = await Promise.all([
    supabase.from("player").select("id, name").eq("id", playerId).single(),
    supabase.from("player_xp_total").select("total_xp").eq("player_id", playerId).maybeSingle(),
    supabase
      .from("team_member")
      .select("joined_at, team:team_id (id, name, mode, season_id)")
      .eq("player_id", playerId)
      .order("joined_at", { ascending: false }),
    supabase.from("season").select("id, number, chapter:chapter_id (number, city)").order("number", { ascending: false }),
    supabase.from("badge").select("key, name, description, id"),
    supabase.from("player_badge").select("badge_id, awarded_at").eq("player_id", playerId),
    supabase.from("xp_event").select("id", { count: "exact", head: true }).eq("player_id", playerId).eq("reason", "hidden_quest"),
    supabase.from("attendance").select("session_id").eq("player_id", playerId),
    supabase.rpc("my_pass_season"),
  ]);

  const player = playerRes.data as unknown as { id: string; name: string } | null;
  if (!player) return { kind: "no-pass", email, isStaff, isAdmin };

  const totalXp = Number((xpRes.data as unknown as { total_xp: number } | null)?.total_xp ?? 0);

  const memberships = rows<{ team: TeamRow | null }>(memberRes.data);
  const seasons = rows<SeasonRow>(seasonRes.data);
  // The season on the pass: tonight's gathering if they have a ticket, else their latest team, else
  // their latest ticket (my_pass_season()). A brand-new self-signup has none yet: they pick a route.
  const passSeasonId = typeof passSeasonRes.data === "string" ? passSeasonRes.data : null;
  const seasonRow = (passSeasonId && seasons.find((s) => s.id === passSeasonId)) || null;
  const team = memberships.find((m) => m.team && m.team.season_id === seasonRow?.id)?.team ?? null;

  const earnedAt = new Map(rows<{ badge_id: string; awarded_at: string }>(myBadgeRes.data).map((b) => [b.badge_id, b.awarded_at]));
  const badges: PassBadge[] = rows<{ id: string; key: string; name: string; description: string | null }>(badgeRes.data)
    .map((b) => ({ key: b.key, name: b.name, description: b.description, earned: earnedAt.has(b.id), earnedAt: earnedAt.get(b.id) ?? null }))
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

  let sessions = pickSessions(sessionList);
  // Open routes: the pass follows the route the team started last (several can be open at once).
  const hasRoutes = sessionList.some((s) => s.open_until);
  if (hasRoutes) {
    const { data: routeId } = await supabase.rpc("my_route");
    const route = sessionList.find((s) => s.id === routeId);
    if (route) sessions = { live: route.status === "live" ? route : null, next: null, last: route.status === "closed" ? route : null };
  }
  const focusSession = sessions.live ?? sessions.last;
  let focus: Extract<PassData, { kind: "pass" }>["focus"] = null;
  if (focusSession && focusSession.status !== "scheduled") {
    const [{ data }, { data: guidedData }, { data: photoData }] = await Promise.all([
      supabase.rpc("player_quests", { p_session_id: focusSession.id }),
      supabase.rpc("my_guided", { p_session_id: focusSession.id }),
      // Returns nothing (and the pass works as before) until the challenges migration has been applied.
      supabase.rpc("my_photo_asks", { p_session_id: focusSession.id }),
    ]);
    const photoAsks: Record<string, number> = {};
    for (const p of rows<{ quest_id: string; photos: number }>(photoData)) photoAsks[p.quest_id] = p.photos;
    const guided = (guidedData as Guided | null) ?? null;
    focus = { session: focusSession, quests: questViews(rows<PassQuest>(data), focusSession.status, guided?.slot ?? null), guided, photoAsks };
    // Test count: the team has the mission in front of them (counted once per team and stop).
    const active = focus.quests.find((q) => q.state === "active");
    if (guided?.open_route && focusSession.status === "live" && active) {
      await supabase.rpc("log_play", { p_kind: "quest_start", p_session_id: focusSession.id, p_quest_id: active.id });
    }
  }

  // Routes to play: with no team yet, or once the current route is done or over.
  let routes: OpenRoute[] = [];
  const routeDone = !!focus?.guided?.open_route && (focus.session.status === "closed" || focus.quests.filter((q) => q.mission !== undefined).every((q) => q.state === "done"));
  if (!team || routeDone) {
    const { data: routeRows } = await supabase.rpc("open_routes");
    routes = rows<OpenRoute>(routeRows);
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
    routes,
  };
}
