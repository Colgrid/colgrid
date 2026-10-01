// Questions shown on the home page (the short list) and on /faq (everything).
// Facts come from docs/game-design.md and docs/pricing.md.
export type Faq = { q: string; a: string };

export const HOME_FAQ: Faq[] = [
  { q: "Do I need a team?", a: "No. Come solo and we'll put you on one." },
  { q: "Who can play?", a: "Adults 18 and over." },
  { q: "Where do we meet?", a: "In 9th & 9th. The exact spot drops 48 hours before, by email." },
  { q: "What's included?", a: "3–4 hosted missions, local tastings, the finale meal, a keepsake, and your Colgrid pass." },
];

export const FULL_FAQ: Faq[] = [
  {
    q: "What is Colgrid?",
    a: "Colgrid is a real-world team game. You and your team explore one neighborhood, taking on missions hosted by local makers, kitchens and guides. Your XP, level and badges carry forward to every gathering and every city.",
  },
  ...HOME_FAQ,
  { q: "How much does it cost?", a: "$75 per player, on Eventbrite." },
  { q: "How long is a gathering?", a: "About 3 hours, in one walkable neighborhood." },
  {
    q: "Is it competitive?",
    a: "No. Nobody is ranked, and there's no race against other teams. Everyone earns XP and badges that carry forward.",
  },
  { q: "Do I need an app?", a: "No download. Your Colgrid pass opens in your phone's browser at colgrid.app." },
  {
    q: "Can we book a private run for our company?",
    a: "Yes. Private runs start at $2,500 for up to 20 players, plus $95 per extra player. See the Companies page to get a quote.",
  },
];
