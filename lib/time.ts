// Session times are entered and shown in the chapter's local time (Salt Lake City), whatever the
// server's or browser's time zone is. No date library: Intl does the time-zone math.
export const CHAPTER_TIME_ZONE = "America/Denver";

// Minutes that zone is ahead of UTC at this instant (e.g. -360 for MDT... -420 for MST).
function offsetMinutes(instant: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(instant);
  const n = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  const asUtc = Date.UTC(n("year"), n("month") - 1, n("day"), n("hour"), n("minute"), n("second"));
  return Math.round((asUtc - instant.getTime()) / 60000);
}

// "2026-10-17T18:30" (wall clock in the zone) -> ISO instant in UTC. Null if empty or invalid.
export function localToIso(local: string, timeZone: string = CHAPTER_TIME_ZONE): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(local.trim());
  if (!m) return null;
  const [, y, mo, d, h, mi] = m.map(Number);
  const guess = Date.UTC(y, mo - 1, d, h, mi);
  // Two passes handle the offset changing near daylight-saving switches.
  let instant = guess - offsetMinutes(new Date(guess), timeZone) * 60000;
  instant = guess - offsetMinutes(new Date(instant), timeZone) * 60000;
  return new Date(instant).toISOString();
}

// ISO instant -> "2026-10-17T18:30" wall clock in the zone, for <input type="datetime-local">.
export function isoToLocal(iso: string | null | undefined, timeZone: string = CHAPTER_TIME_ZONE): string {
  if (!iso) return "";
  const t = new Date(iso);
  if (Number.isNaN(t.getTime())) return "";
  const local = new Date(t.getTime() + offsetMinutes(t, timeZone) * 60000);
  return local.toISOString().slice(0, 16);
}

// "Sat, Oct 17, 6:30 PM"
export function formatWhen(iso: string | null | undefined, timeZone: string = CHAPTER_TIME_ZONE): string {
  if (!iso) return "Date not set";
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone,
  }).format(new Date(iso));
}
