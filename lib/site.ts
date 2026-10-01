// One place for how Colgrid describes itself to search engines, link previews and AI assistants.
// Wording follows docs/brand-identity.md (positioning, key messages) and prices follow docs/pricing.md.
export const SITE = {
  name: "Colgrid",
  url: "https://getcolgrid.com", // the public site: home, corporate, hosts, contact, legal
  appUrl: "https://colgrid.app", // the player app: sign-in, pass, quests, check-in, XP (and crew tools)
  tagline: "Your city has missions.",
  title: "Colgrid: a real-world team game in Salt Lake City",
  description:
    "Colgrid is a real-world game you play with friends. Pick a route through a Salt Lake City neighborhood, take on missions at local makers, kitchens and hidden places, and earn XP, levels and badges that follow you to every route and every city.",
  shortDescription:
    "A real-world game you play with friends in Salt Lake City. Routes through local places, missions at every stop, and XP, levels and badges that follow you to every city.",
  locale: "en_US",
  city: "Salt Lake City",
  region: "UT",
  country: "US",
  location: "Salt Lake City, Utah",
  // The line at the bottom of every page. No city: Colgrid will run in more than one.
  footerLine: "Colgrid creates fun team experiences with games, challenges, food, and local adventures.",
  // Legal name, used only where it matters (Terms, Privacy). The brand everywhere else is just "Colgrid".
  legalName: "Colgrid LLC",
  // Where form submissions (corporate, host, contact) are sent. Never shown on the site:
  // visitors use the contact form, which keeps the address away from spam bots.
  notifyEmail: "colgridco@gmail.com",
  // Game-day support (Quo): calls and texts. Shown on the pass and in player emails, not on the public site.
  support: { label: "Need help? Call or text us.", phone: "(801) 441-3621", tel: "+18014413621" },
  // Cloudflare Turnstile site key (public by design). The secret goes in Vercel as TURNSTILE_SECRET_KEY.
  // Blank = the forms work without the check (the hidden honeypot field still stops simple bots).
  turnstileSiteKey: "",
  // The tournament (team rankings, standings, Chapter Finals) is paused: Colgrid is about the
  // experience first (decided Sept 30, 2026). While false, players never see standings or the
  // tournament switch. The rules and database stay in place for when it comes back.
  tournamentOpen: false,
  // Official profiles, in the footer. Listed in structured data ("sameAs") so search engines and AI assistants
  // know these accounts are Colgrid, and linked in the site footer.
  social: [
    { name: "Instagram", url: "https://www.instagram.com/colgrid/" },
    { name: "TikTok", url: "https://www.tiktok.com/@colgrid0" },
    { name: "LinkedIn", url: "https://www.linkedin.com/company/colgrid/" },
    // Add Facebook here once the page exists.
  ],
} as const;
