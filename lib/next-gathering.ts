// The next gathering to point players to after a night ends. Used in the thank-you email only:
// the pass stays about the experience, email does the bringing-back. Pure, so it can be tested.

export type Gathering = { when: string; neighborhood: string; ticketUrl: string; startsAt: string; ticketsOpen: boolean };

export function upcomingGathering(g: Gathering, after: string | null = null, now: number = Date.now()): Gathering | null {
  if (!g.ticketsOpen || !g.ticketUrl) return null;
  const start = Date.parse(g.startsAt);
  if (!Number.isFinite(start) || start <= now) return null;
  // Never offer the gathering the player just played as "next".
  if (after && start <= Date.parse(after)) return null;
  return g;
}
