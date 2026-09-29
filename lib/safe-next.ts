// Where to send someone after they sign in (e.g. back to the check-in page a QR code opened).
// Only paths on this site are allowed, so a link can't bounce people to another website.
export const NEXT_COOKIE = "colgrid_next";

export function safeNext(value: string | null | undefined): string | null {
  if (!value || value.length > 300) return null;
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return null;
  if (/[\r\n\t]/.test(value)) return null;
  return value;
}
