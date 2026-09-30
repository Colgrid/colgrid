// One place for how Colgrid describes itself to search engines, link previews and AI assistants.
// Wording follows docs/brand-identity.md (positioning, key messages) and prices follow docs/pricing.md.
export const SITE = {
  name: "Colgrid",
  url: "https://getcolgrid.com",
  tagline: "Your city has missions.",
  title: "Colgrid: a real-world team game in Salt Lake City",
  description:
    "Colgrid is a real-world team game that turns a city into missions. Meet your team in one walkable Salt Lake City neighborhood, take on quests hosted by local makers, kitchens and guides, and earn XP, levels and badges that follow you to every gathering and every city. Play casually, or opt into the tournament.",
  shortDescription:
    "A real-world team game in Salt Lake City. Missions hosted by local makers, kitchens and guides. XP, levels and badges that follow you to every city.",
  locale: "en_US",
  city: "Salt Lake City",
  region: "UT",
  country: "US",
  email: "colgridco@gmail.com",
  // The next gathering shown on the home page. Flip ticketsOpen to true when you're ready to promote:
  // the "Get tickets" button, the Eventbrite link and the search-engine event listing only appear then.
  nextGathering: {
    name: "Colgrid Pilot · 9th & 9th",
    when: "Saturday, October 17 · 4–7 PM",
    startsAt: "2026-10-17T16:00:00-06:00",
    endsAt: "2026-10-17T19:00:00-06:00",
    neighborhood: "9th & 9th",
    price: 75,
    ticketUrl: "https://www.eventbrite.com/e/9th-9th-interactive-team-quest-tastings-finale-meal-tickets-2002520543853",
    ticketsOpen: true,
  },
  // Official profiles. Listed in structured data ("sameAs") so search engines and AI assistants
  // know these accounts are Colgrid, and linked in the site footer.
  social: [
    { name: "Instagram", url: "https://www.instagram.com/colgrid/" },
    { name: "X", url: "https://x.com/Colgrid" },
    { name: "TikTok", url: "https://www.tiktok.com/@colgrid0" },
    { name: "YouTube", url: "https://www.youtube.com/@Colgrid" },
    { name: "LinkedIn", url: "https://www.linkedin.com/company/colgrid/" },
    { name: "Reddit", url: "https://www.reddit.com/user/Colgrid/" },
    { name: "Pinterest", url: "https://www.pinterest.com/colgrid/" },
    { name: "GitHub", url: "https://github.com/Colgrid" },
  ],
} as const;
