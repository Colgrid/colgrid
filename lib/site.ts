// One place for how Colgrid describes itself to search engines, link previews and AI assistants.
// Wording follows docs/brand-identity.md (positioning, key messages) and prices follow docs/pricing.md.
export const SITE = {
  name: "Colgrid",
  url: "https://getcolgrid.com", // the public site: home, companies, businesses, contact, legal
  appUrl: "https://colgrid.app", // the player app: sign-in, pass, quests, check-in, XP (and crew tools)
  tagline: "Your community has a problem. People want to help.",
  title: "Colgrid: community challenges in Salt Lake City",
  description:
    "Colgrid turns a real community problem into a challenge neighbors can show up for. A community organization brings the problem, people who live nearby come out and do the work together, and we report what changed.",
  shortDescription:
    "Community challenges in Salt Lake City. Community organizations bring the problem. Neighbors show up and do the work. Results reported.",
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

// What the public site sells (decided Oct 2, 2026): community challenges. A community organization pays,
// neighbors take part because they want to help change something where they live (creating shared value).
// Prices follow business/ (challenge-model business plan). They are starting prices, still to be tested.
export const CHALLENGE = {
  plans: [
    { name: "Pilot", price: "$1,500", note: "One challenge day. One-page report." },
    { name: "Standard", price: "$3,500", note: "Fully custom. More neighbors. Detailed report." },
    { name: "Monthly", price: "$2,500/mo", note: "A challenge every month. Quarterly report." },
  ],
  // Photo of people helping, shown in the hero. Swap for a real photo from a challenge when there is one.
  heroPhoto: "/home/game-night.jpg",
  heroPhotoAlt: "A group of people laughing together around a table.",
  // Example challenges shown as cards on the home page. Each card shows what people are asked to do.
  // `photo` is a path under /public (e.g. "/home/creek.jpg"); leave it blank to show a colored tile.
  examples: [
    { title: "Safer streets", who: "Neighborhood councils and schools", ask: "Walk the route kids take to school. Mark every crossing that feels unsafe.", tone: "teal", photo: "" },
    { title: "Clean the creek", who: "Parks and watershed groups", ask: "Fill one bag along the creek trail. Weigh it at the finish.", tone: "amber", photo: "" },
    { title: "Stock the pantry", who: "Food pantries", ask: "Your team has $20 and the pantry's short list. Bring back what's missing.", tone: "red", photo: "" },
    { title: "Know your neighbors", who: "Neighborhood councils", ask: "Find someone on your street you've never met. Learn one thing they'd change here.", tone: "amber", photo: "" },
    { title: "Keep it local", who: "Small-business districts", ask: "Three shops behind the orange cones. Buy one thing under $5 at each.", tone: "red", photo: "" },
    { title: "Plant the block", who: "Tree and garden groups", ask: "Plant one tree with your team. Name it. Check on it in a month.", tone: "teal", photo: "" },
  ],
  // The sample report on the home page (a "Safer streets" challenge). Illustrative numbers, labeled
  // "Sample" on the page. Replace with a real report after the first challenge.
  sample: {
    stats: [
      { n: "64", label: "neighbors showed up" },
      { n: "212", label: "crossings checked" },
      { n: "38", label: "flagged unsafe" },
      { n: "41", label: "first-time volunteers" },
    ],
    stops: [
      { name: "By the school", visits: 14 },
      { name: "By the park", visits: 11 },
      { name: "Bus stop", visits: 8 },
      { name: "Main street", visits: 5 },
    ],
    barsLabel: "Unsafe crossings flagged, by area",
    quote: "\u201cThree years here and this is the first thing I've done with my neighbors.\u201d",
  },
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
