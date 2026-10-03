// One place for how Colgrid describes itself to search engines, link previews and AI assistants.
// Wording follows docs/brand-identity.md (positioning, key messages) and prices follow docs/pricing.md.
export const SITE = {
  name: "Colgrid",
  url: "https://getcolgrid.com", // the public site: home, companies, businesses, contact, legal
  appUrl: "https://colgrid.app", // the player app: sign-in, pass, quests, check-in, XP (and crew tools)
  tagline: "Colgrid turns people who care into people who act.",
  title: "Colgrid turns people who care into people who act",
  description:
    "Colgrid turns people who care into people who act. We organize everyday citizens to solve urgent local challenges, delivering real, measurable field impact for the organizations funding change.",
  shortDescription:
    "Colgrid turns people who care into people who act. Organizations fund the work. Neighbors take direct action together. Results verified.",
  locale: "en_US",
  city: "Salt Lake City",
  region: "UT",
  country: "US",
  location: "Salt Lake City, Utah",
  // The line at the bottom of every page. No city: Colgrid will run in more than one.
  footerLine: "Colgrid turns people who care into people who act.",
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
  // Booking link (Cal.com or Calendly) for the 20-minute strategy call. Blank = no scheduler shown;
  // the lead form still works and Matt replies by email. Paste the link here when the calendar exists.
  schedulerUrl: "",
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

// What the public site sells (blueprint of Oct 2, 2026): paid civic action and crowdsourced field
// operations. Organizations (business districts, city groups, nonprofits, developers) pay Colgrid as a
// contractor to mobilize everyday citizens, coordinate the field work and deliver verified impact.
// Prices are starting prices, still to be tested.
export const CHALLENGE = {
  plans: [
    { name: "Pilot Challenge", price: "$1,500", note: "One challenge day. One-page Outcome Report." },
    { name: "Standard Challenge", price: "$3,500", note: "Fully custom. More participants. Detailed Outcome Report." },
    { name: "Campaign Contract", price: "$2,500/mo", note: "A challenge every month. Quarterly Outcome Report." },
  ],
  // How participants are paid (reward model of Oct 2, 2026). Funded by the client and sponsors, and
  // released only after a verified check-in or photo. Amounts are starting assumptions.
  rewards: [
    { name: "Guaranteed rewards", amount: "$10 gift card", body: "Complete a set of asks, such as visiting three businesses, and the reward is guaranteed." },
    { name: "Business-sponsored rewards", amount: "Paid by the business", body: "A business pays for a specific ask, like 50 people visiting and giving feedback. The people who complete it are rewarded." },
    { name: "Performance pool", amount: "A share of the bonus", body: "The client adds a bonus if the challenge reaches its target. Part of it goes to the people who created the result. Better results, more to share." },
  ],
  terms: "50% deposit at signing. 50% due within 15 days of your Outcome Report.",
  // Photo of people, shown in the hero. Swap for a real photo from a challenge when there is one.
  heroPhoto: "/home/field-team.jpg",
  heroPhotoAlt: "Four neighbors at a street crossing: two in Colgrid shirts with a clipboard and a phone, one photographing a street sign, one watching the road.",
  // "What we solve" cards on the home page. `ask` is what participants are asked to do.
  // `photo` is a path under /public (e.g. "/home/creek.jpg"); leave it blank to show a colored tile.
  examples: [
    { title: "Vision safety audits", body: "Citizens systematically inspect crosswalks, lighting and speed zones to force city infrastructure improvements.", ask: "Walk the route kids take to school. Log every crossing that feels unsafe.", tone: "teal", photo: "" },
    { title: "Environmental field logging", body: "Crowd teams map trail erosion, creek pollution or urban heat zones to direct remediation funding.", ask: "Walk the creek trail. Photograph and pin every spot that needs repair.", tone: "amber", photo: "" },
    { title: "Food security and pantry drives", body: "Rapid-response citizen teams collect and route essential goods to local distribution points.", ask: "Your team has the pantry's short list. Collect what's missing and deliver it.", tone: "red", photo: "" },
    { title: "District economic revitalization", body: "Organized local actions that direct foot traffic back into small business corridors facing construction or economic disruption.", ask: "Three shops behind the orange cones. Buy one thing under $5 at each.", tone: "amber", photo: "" },
  ],
  // The sample report on the home page (a safety audit). Illustrative numbers, labeled "Sample" on the
  // page. Replace with a real report after the first challenge.
  sample: {
    stats: [
      { n: "64", label: "residents took part" },
      { n: "212", label: "crossings audited" },
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
