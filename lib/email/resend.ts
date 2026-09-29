// Sends emails through Resend's batch API with the RESEND_API_KEY server variable
// (never NEXT_PUBLIC_, never in GitHub). Up to 100 per request.
export type Email = { from: string; to: string[]; subject: string; html: string; text: string };

export const FROM = "Colgrid <pass@getcolgrid.com>";

export async function sendBatch(emails: Email[]): Promise<{ sent: string[]; error: string | null }> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { sent: [], error: "RESEND_API_KEY isn't set in Vercel, so no emails were sent." };
  const sent: string[] = [];
  for (let i = 0; i < emails.length; i += 100) {
    const batch = emails.slice(i, i + 100);
    const res = await fetch("https://api.resend.com/emails/batch", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify(batch),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.error("Resend batch failed", res.status, detail.slice(0, 300));
      return { sent, error: `Resend refused the send (${res.status}). ${sent.length} sent before that.` };
    }
    sent.push(...batch.flatMap((e) => e.to));
  }
  return { sent, error: null };
}

export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string);
}

// The dark Colgrid email shell used by every message.
export function shell(headline: string, paragraphs: string[], button?: { label: string; href: string }, logoUrl = "https://getcolgrid.com/brand/colgrid-logo.png"): string {
  const body = paragraphs
    .map((p) => `<p style="margin:14px 0 0;font-size:17px;line-height:1.5;color:#C9CDD2;">${p}</p>`)
    .join("\n    ");
  const cta = button
    ? `<a href="${button.href}" style="display:block;margin:28px 0 0;padding:18px 20px;background:#FF9F1C;color:#1A1D20;border-radius:14px;text-align:center;font-size:17px;font-weight:700;text-decoration:none;">${escapeHtml(button.label)}</a>`
    : "";
  return `<div style="margin:0;padding:32px 16px;background:#1A1D20;font-family:'Space Grotesk',Helvetica,Arial,sans-serif;color:#F4F5F7;">
  <div style="max-width:440px;margin:0 auto;">
    <div style="display:inline-block;background:#FFFFFF;border-radius:12px;padding:6px;">
      <img src="${logoUrl}" width="44" height="44" alt="Colgrid" style="display:block;border:0;">
    </div>
    <p style="margin:28px 0 0;font-family:'JetBrains Mono',Menlo,monospace;font-size:12px;letter-spacing:2px;color:#2EC4B6;">CHAPTER 01 &middot; SALT LAKE CITY</p>
    <h1 style="margin:8px 0 0;font-size:30px;line-height:1.1;color:#F4F5F7;">${escapeHtml(headline)}</h1>
    ${body}
    ${cta}
    <p style="margin:24px 0 0;font-size:14px;color:#8A9097;">Colgrid &middot; getcolgrid.com</p>
  </div>
</div>`;
}
