// Open routes (self-guided play): small pure helpers, tested in routes.test.ts.

// "Open in Maps": hands off to the phone's own maps app (no map inside Colgrid).
// iPhone → Apple Maps; everything else → Google Maps. With no pin, searches the place text.
export function mapsUrl(stop: { lat?: number | null; lng?: number | null; where?: string | null }, ios: boolean): string | null {
  const hasPin = typeof stop.lat === "number" && typeof stop.lng === "number";
  const q = hasPin ? `${stop.lat},${stop.lng}` : (stop.where ?? "").trim();
  if (!q) return null;
  if (ios) {
    return hasPin
      ? `https://maps.apple.com/?ll=${stop.lat},${stop.lng}&q=${encodeURIComponent(stop.where?.trim() || "Colgrid stop")}`
      : `https://maps.apple.com/?q=${encodeURIComponent(q)}`;
  }
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
}

export const isIos = (userAgent: string | null | undefined) => /iphone|ipad|ipod/i.test(userAgent ?? "");

// "Open through Oct 21" (Salt Lake time).
export function openThrough(iso: string | null | undefined): string | null {
  if (!iso) return null;
  // The window ends at a moment; show the last day it's playable.
  const last = new Date(new Date(iso).getTime() - 1000);
  return `Open through ${new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "America/Denver" }).format(last)}`;
}

// Invite links: colgrid.app/join/<10 lowercase letters/digits>.
export const isInviteToken = (t: string) => /^[a-z0-9]{10}$/i.test(t);
export const isRouteSlug = (s: string) => /^[a-z0-9][a-z0-9-]{1,39}$/i.test(s);
