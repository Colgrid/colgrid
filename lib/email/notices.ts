// Emails the game master sends from the console: the location reveal and the thank-you + survey.
import { upcomingGathering } from "@/lib/next-gathering";
import { SITE } from "@/lib/site";
import { FROM, escapeHtml, shell, type Email } from "./resend";

export type Recipient = { email: string; name: string };
export type SessionInfo = { label: string; neighborhood: string | null; when: string };

const first = (name: string) => name.split(" ")[0] || "there";

export function revealEmail(to: Recipient, s: SessionInfo, location: string): Email {
  const subject = `Location drop: ${location}`;
  const where = s.neighborhood ? ` in ${s.neighborhood}` : "";
  const text = [
    `${first(to.name)}, the location just dropped.`,
    "",
    `${s.label}${where}, ${s.when}.`,
    `Start here: ${location}`,
    "",
    `Your team gets assigned when you arrive. Your pass: ${SITE.appUrl}/pass`,
    "",
    `${SITE.support.label} ${SITE.support.phone}`,
    "",
    "Colgrid",
  ].join("\n");
  const html = shell(
    "The location just dropped.",
    [
      `${escapeHtml(s.label)}${escapeHtml(where)} &middot; ${escapeHtml(s.when)}`,
      `<strong style="color:#F4F5F7;">Start here: ${escapeHtml(location)}</strong>`,
      "Your team gets assigned when you arrive. Bring your phone, charged.",
      `${escapeHtml(SITE.support.label)} <a href="tel:${SITE.support.tel}" style="color:#FF9F1C;font-weight:700;text-decoration:none;">${escapeHtml(SITE.support.phone)}</a>`,
    ],
    { label: "Open my pass", href: `${SITE.appUrl}/pass` },
  );
  return { from: FROM, to: [to.email], subject, html, text };
}

export function thanksEmail(to: Recipient, s: SessionInfo, surveyUrl: string | null): Email {
  const subject = "You played Colgrid. How was it?";
  // Come back: the next gathering, if it's announced and tickets are open (email only, never the pass).
  const next = upcomingGathering(SITE.nextGathering, new Date().toISOString());
  const lines = [
    `Thanks for playing ${s.label}, ${first(to.name)}. Your XP, level and badges are on your pass, and they carry forward to every gathering.`,
    surveyUrl ? `Tell us how it went. It takes two minutes and shapes the next one: ${surveyUrl}` : "",
    next ? `Come back: ${next.when} · ${next.neighborhood}. Get tickets: ${next.ticketUrl}` : "",
  ].filter(Boolean);
  const text = [...lines, "", `Your pass: ${SITE.appUrl}/pass`, "", "Colgrid"].join("\n\n");
  const html = shell(
    "You played. How was it?",
    [
      `Thanks for playing ${escapeHtml(s.label)}. Your XP, level and badges are on your pass, and they carry forward to every gathering.`,
      surveyUrl ? "Tell us how it went. It takes two minutes and shapes the next one." : "",
      next
        ? `<strong style="color:#F4F5F7;">Come back</strong><br>${escapeHtml(next.when)} · ${escapeHtml(next.neighborhood)}<br><a href="${next.ticketUrl}" style="color:#FF9F1C;font-weight:700;">Get tickets</a>`
        : "",
    ].filter(Boolean),
    surveyUrl ? { label: "Take the 2-minute survey", href: surveyUrl } : { label: "Open my pass", href: `${SITE.appUrl}/pass` },
  );
  return { from: FROM, to: [to.email], subject, html, text };
}
