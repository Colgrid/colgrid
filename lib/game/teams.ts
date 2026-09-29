// Suggests teams for the opening ritual: people who bought together stay together, solo players
// fill the gaps, and no team goes over the size limit. The game master can still move anyone.
// Pure, so it can be unit-tested (teams.test.ts).

export type Unassigned = { id: string; order_ref: string | null };

export function planTeams(players: readonly Unassigned[], teamSize = 5): string[][] {
  const size = Math.max(2, Math.floor(teamSize));
  // Group by order (a group that bought together). No order = on their own.
  const byOrder = new Map<string, string[]>();
  const groups: string[][] = [];
  for (const p of players) {
    if (p.order_ref) {
      const g = byOrder.get(p.order_ref) ?? [];
      if (g.length === 0) byOrder.set(p.order_ref, g);
      g.push(p.id);
    } else {
      groups.push([p.id]);
    }
  }
  groups.push(...byOrder.values());

  // Groups bigger than a team are split into team-sized pieces.
  const pieces: string[][] = [];
  for (const g of groups) for (let i = 0; i < g.length; i += size) pieces.push(g.slice(i, i + size));

  // First-fit decreasing: place the biggest groups first, each into the first team with room.
  pieces.sort((a, b) => b.length - a.length);
  const teams: string[][] = [];
  for (const piece of pieces) {
    const home = teams.find((t) => t.length + piece.length <= size);
    if (home) home.push(...piece);
    else teams.push([...piece]);
  }

  // Don't leave someone alone: move solos out of a 1-person team into teams with room.
  const lonely = teams.filter((t) => t.length === 1);
  for (const t of lonely) {
    const home = teams.find((o) => o !== t && o.length < size);
    if (home) {
      home.push(...t.splice(0));
    }
  }
  return teams.filter((t) => t.length > 0);
}
