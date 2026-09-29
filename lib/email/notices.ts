// Emails the game master sends from the console: the location reveal and the thank-you + survey.
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
    `Your team gets assigned when you arrive. Your pass: ${SITE.url}/pass`,
    "",
    "Colgrid",
  ].join("\n");
  const html = shell(
    "The location just dropped.",
    [
      `${escapeHtml(s.label)}${escapeHtml(where)} &middot; ${escapeHtml(s.when)}`,
      `<strong style="color:#F4F5F7;">Start here: ${escapeHtml(location)}</strong>`,
      "Your team gets assigned when you arrive. Bring your phone, charged.",
    ],
    { label: "Open my pass", href: `${SITE.url}/pass` },
  );
  return { from: FROM, to: [to.email], subject, html, text };
}

export function thanksEmail(to: Recipient, s: SessionInfo, surveyUrl: string | null): Email {
  const subject = "You played Colgrid. How was it?";
  const lines = [
    `Thanks for playing ${s.label}, ${first(to.name)}. Your XP, level and badges are on your pass, and they carry forward to every gathering.`,
    surveyUrl ? `Tell us how it went. It takes two minutes and shapes the next one: ${surveyUrl}` : "",
  ].filter(Boolean);
  const text = [...lines, "", `Your pass: ${SITE.url}/pass`, "", "Colgrid"].join("\n\n");
  const html = shell(
    "You played. How was it?",
    [
      `Thanks for playing ${escapeHtml(s.label)}. Your XP, level and badges are on your pass, and they carry forward to every gathering.`,
      surveyUrl ? "Tell us how it went. It takes two minutes and shapes the next one." : "",
    ].filter(Boolean),
    surveyUrl ? { label: "Take the 2-minute survey", href: surveyUrl } : { label: "Open my pass", href: `${SITE.url}/pass` },
  );
  return { from: FROM, to: [to.email], subject, html, text };
}
