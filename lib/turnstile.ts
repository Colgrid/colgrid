// Cloudflare Turnstile: invisible-by-default bot check on the public forms.
// Turned on when both keys exist: the site key (public; NEXT_PUBLIC_TURNSTILE_SITE_KEY in Vercel, or
// SITE.turnstileSiteKey) and the secret (TURNSTILE_SECRET_KEY in Vercel, never in GitHub).
// With either missing, forms still work and the hidden honeypot field stops simple bots.
import { SITE } from "@/lib/site";

export const turnstileSiteKey = SITE.turnstileSiteKey || process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "";

export function turnstileOn(): boolean {
  return Boolean(turnstileSiteKey && process.env.TURNSTILE_SECRET_KEY);
}

export async function turnstilePasses(token: string | null): Promise<boolean> {
  if (!turnstileOn()) return true;
  if (!token) return false;
  try {
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ secret: process.env.TURNSTILE_SECRET_KEY ?? "", response: token }).toString(),
    });
    const data = (await res.json()) as { success?: boolean };
    return data.success === true;
  } catch (e) {
    // If Cloudflare can't be reached, don't lose a real lead: let it through (the honeypot still applies).
    console.error("Turnstile check failed to run", e);
    return true;
  }
}
