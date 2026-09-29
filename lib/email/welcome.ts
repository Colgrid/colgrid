// "You're in" email sent after ticket buyers are imported. Sent through Resend's API with the
// RESEND_API_KEY server variable (never NEXT_PUBLIC_, never in GitHub).
import { SITE } from "@/lib/site";
import { FROM, escapeHtml, sendBatch } from "./resend";

export type WelcomeTarget = { email: string; name: string };
export type WelcomeContext = { sessionLabel: string; neighborhood: string | null; when: string };

export function welcomeEmail(to: WelcomeTarget, ctx: WelcomeContext) {
  const first = to.name.split(" ")[0] || "there";
  const where = ctx.neighborhood ? ` in ${ctx.neighborhood}` : "";
  const subject = "You're in. Your Colgrid pass is ready.";
  const signin = `${SITE.url}/signin`;
  const text = [
    `Hi ${first},`,
    "",
    `You're in for ${ctx.sessionLabel}${where}, ${ctx.when}.`,
    "",
    `Your pass is ready. Open it at ${signin} with this email address (the one on your ticket). No password.`,
    "",
    "Your team gets assigned at the start. The exact starting location drops 24–48 hours before. Bring your phone, charged.",
    "",
    "Colgrid",
  ].join("\n");

  const html = `<div style="margin:0;padding:32px 16px;background:#1A1D20;font-family:'Space Grotesk',Helvetica,Arial,sans-serif;color:#F4F5F7;">
  <div style="max-width:440px;margin:0 auto;">
    <div style="display:inline-block;background:#FFFFFF;border-radius:12px;padding:6px;">
      <img src="${SITE.url}/brand/colgrid-logo.png" width="44" height="44" alt="Colgrid" style="display:block;border:0;">
    </div>
    <p style="margin:28px 0 0;font-family:'JetBrains Mono',Menlo,monospace;font-size:12px;letter-spacing:2px;color:#2EC4B6;">CHAPTER 01 &middot; SALT LAKE CITY</p>
    <h1 style="margin:8px 0 0;font-size:30px;line-height:1.1;color:#F4F5F7;">You're in, ${escapeHtml(first)}.</h1>
    <p style="margin:14px 0 0;font-size:17px;line-height:1.5;color:#C9CDD2;">${escapeHtml(ctx.sessionLabel)}${escapeHtml(where)} &middot; ${escapeHtml(ctx.when)}</p>
    <p style="margin:14px 0 0;font-size:17px;line-height:1.5;color:#C9CDD2;">Your pass is ready. Open it with this email address, the one on your ticket. No password.</p>
    <a href="${signin}" style="display:block;margin:28px 0 0;padding:18px 20px;background:#FF9F1C;color:#1A1D20;border-radius:14px;text-align:center;font-size:17px;font-weight:700;text-decoration:none;">Open my pass</a>
    <p style="margin:24px 0 0;font-size:15px;line-height:1.5;color:#C9CDD2;">Your team gets assigned at the start. The exact starting location drops 24&ndash;48 hours before. Bring your phone, charged.</p>
    <p style="margin:24px 0 0;font-size:14px;color:#8A9097;">Colgrid &middot; getcolgrid.com</p>
  </div>
</div>`;
  return { from: FROM, to: [to.email], subject, html, text };
}

// Sends one welcome email per player. Returns the emails that went out.
export async function sendWelcomeEmails(
  targets: WelcomeTarget[],
  ctx: WelcomeContext,
): Promise<{ sent: string[]; error: string | null }> {
  return sendBatch(targets.map((t) => welcomeEmail(t, ctx)));
}
