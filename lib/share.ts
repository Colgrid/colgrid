// Sharing, phase 1: a branded card image + the phone's own share sheet. Pure helpers (tested in
// share.test.ts) so the card, the share text and the link always agree.
//
// Spoiler protection: a share never carries a mission's title, place, briefing, answer or host.
// Only the mission number, XP, level, the neighborhood (already public) and the date. Other teams
// that night, and players at future gatherings, can't learn anything from it.

export type ShareKind = "mission" | "all" | "hidden" | "level";

export type ShareMoment = {
  kind: ShareKind;
  mission: number | null; // 3 (of 4)
  of: number | null;
  xp: number; // XP just earned
  level: number | null; // set when this moment leveled the player up
  place: string | null; // neighborhood, e.g. "9th & 9th"
  date: string | null; // ISO date of the session
};

const clampInt = (v: unknown, min: number, max: number): number | null => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, Math.round(n))) : null;
};
// Neighborhood names only: letters, numbers, spaces and a few separators. Nothing else gets onto a card.
const cleanPlace = (v: unknown): string | null => {
  const s = String(v ?? "").replace(/[^\p{L}\p{N} &'.\-]/gu, "").trim().slice(0, 40);
  return s || null;
};
const cleanDate = (v: unknown): string | null => {
  const s = String(v ?? "");
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
};

// Query string for the card image (/share/card?...).
export function cardQuery(m: ShareMoment): string {
  const q = new URLSearchParams({ k: m.kind, xp: String(m.xp) });
  if (m.mission) q.set("n", String(m.mission));
  if (m.of) q.set("of", String(m.of));
  if (m.level) q.set("lvl", String(m.level));
  if (m.place) q.set("place", m.place);
  if (m.date) q.set("d", m.date);
  return q.toString();
}

// Read it back on the server, trusting nothing.
export function parseCardQuery(params: URLSearchParams): ShareMoment {
  const k = params.get("k");
  const kind: ShareKind = k === "all" || k === "hidden" || k === "level" ? k : "mission";
  return {
    kind,
    mission: clampInt(params.get("n"), 1, 20),
    of: clampInt(params.get("of"), 1, 20),
    xp: clampInt(params.get("xp"), 0, 500) ?? 0,
    level: params.get("lvl") ? clampInt(params.get("lvl"), 1, 99) : null,
    place: cleanPlace(params.get("place")),
    date: cleanDate(params.get("d")),
  };
}

// The card's main line, in the order of the example card: COLGRID / MISSION 3 COMPLETE / place / XP / date.
export function cardTitle(m: ShareMoment): string {
  switch (m.kind) {
    case "all":
      return "ALL MISSIONS COMPLETE";
    case "hidden":
      return "HIDDEN QUEST FOUND";
    case "level":
      return m.level ? `LEVEL ${String(m.level).padStart(2, "0")}` : "LEVEL UP";
    default:
      return m.mission ? `MISSION ${m.mission} COMPLETE` : "MISSION COMPLETE";
  }
}

// A level-up that happened on this moment shows as one extra line under the XP.
export function cardLevelLine(m: ShareMoment): string | null {
  return m.kind !== "level" && m.level ? `LEVEL ${String(m.level).padStart(2, "0")} UNLOCKED` : null;
}

export function shareLink(kind: ShareKind, site = "https://getcolgrid.com"): string {
  return `${site}/?utm_source=share&utm_medium=player&utm_campaign=${kind}`;
}

// The editable text that goes with the card.
export function defaultShareText(m: ShareMoment, site?: string): string {
  const where = m.place ? ` in ${m.place}` : "";
  const lvl = m.level ? ` Level ${String(m.level).padStart(2, "0")} unlocked.` : "";
  const line =
    m.kind === "all"
      ? `Every mission done at Colgrid${where}.${lvl}`
      : m.kind === "hidden"
        ? `Found a hidden quest at Colgrid${where}. Not telling where.`
        : m.kind === "level"
          ? `Leveled up at Colgrid${where}.${lvl}`
          : `${m.mission && m.of ? `Mission ${m.mission} of ${m.of}` : "Mission"} done at Colgrid${where}. +${m.xp} XP.${lvl}`;
  return `${line}\n${shareLink(m.kind, site)}`;
}

export function formatCardDate(iso: string | null): string | null {
  if (!iso) return null;
  const [y, mo, d] = iso.split("-").map(Number);
  const months = ["JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE", "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"];
  return `${months[mo - 1]} ${d}, ${y}`;
}
