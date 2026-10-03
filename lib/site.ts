// One place for how Colgrid describes itself to search engines, link previews and AI assistants.
// Wording follows docs/brand-identity.md (positioning, key messages) and prices follow docs/pricing.md.
export const SITE = {
  name: "Colgrid",
  url: "https://getcolgrid.com", // the public site: home, companies, businesses, contact, legal
  appUrl: "https://colgrid.app", // the player app: sign-in, pass, quests, check-in, XP (and crew tools)
  tagline: "Turn your goal into a game people show up for.",
  title: "Colgrid: real-world challenges that get people to show up, in Salt Lake City",
  description:
    "Colgrid turns an organization's goal into a real-world team game. We design the challenge, bring the players, run the day and report what happened: who came, where they went and what they said.",
  shortDescription:
    "Real-world team challenges for business districts, developers and community organizations in Salt Lake City. Players included. Results reported.",
  locale: "en_US",
  city: "Salt Lake City",
  region: "UT",
  country: "US",
  location: "Salt Lake City, Utah",
  // The line at the bottom of every page. No city: Colgrid will run in more than one.
  footerLine: "Colgrid creates in-person experiences that help people connect with others in their city.",
  // Legal name, used only where it matters (Terms, Privacy). The brand everywhere else is just "Colgrid".
  legalName: "Colgrid LLC",
  // Where form submissions (corporate, business, contact) are sent. Never shown on the site:
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

// What the public site sells (decided Oct 2, 2026): challenges paid for by the organization with the goal.
// Prices follow business/ (challenge-model business plan). They are starting prices, still to be tested.
export const CHALLENGE = {
  plans: [
    { name: "Pilot", price: "$1,500", note: "One game day, up to 10 stops, a one-page report. For a first challenge." },
    { name: "Standard", price: "$3,500", note: "Fully custom, more players, sponsor missions, a detailed report with player feedback." },
    { name: "Monthly", price: "$2,500 a month", note: "A challenge every month, season standings, a quarterly report." },
  ],
} as const;

// The next hosted night, shown on the nights page (/nights). Change it here and the page follows.
// Tickets are sold on Eventbrite (no checkout on this site).
export const NIGHT = {
  name: "Game Night for Singles",
  ages: "Singles, ages 21 to 35",
  date: "Thursday, October 22",
  shortDate: "Thu, Oct 22",
  time: "7 to 10 PM",
  doors: "Doors at 7:00. Games start at 7:30.",
  area: "Sugar House, Salt Lake City",
  // Shown only once the venue has confirmed the date in writing: set venueConfirmed to true.
  venue: "Sugar House Pub",
  venueAddress: "1994 S 1100 E, Salt Lake City",
  venueConfirmed: false,
  prices: [
    { label: "Early bird", price: "$21", note: "through Oct 15" },
    { label: "General", price: "$25", note: "" },
    { label: "At the door", price: "$29", note: "if there's room" },
  ],
  // Paste the Eventbrite listing link here once it is published. Until then the button
  // opens Colgrid's Eventbrite page, where the listing appears as soon as it goes live.
  ticketUrl: "",
  organizerUrl: "https://www.eventbrite.com/o/colgrid-121801268102",
} as const;
