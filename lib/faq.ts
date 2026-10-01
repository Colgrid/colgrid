// Questions shown on the home page (the short list) and on /faq (everything).
// Facts come from docs/game-design.md and docs/mvp-spec.md (Open Play).
export type Faq = { q: string; a: string };

export const HOME_FAQ: Faq[] = [
  { q: "Do I need a team?", a: "Start one and invite your friends with a link. They join from their own phones." },
  { q: "When can we play?", a: "Whenever you like, while the places on the route are open. Each stop shows its hours." },
  { q: "Who can play?", a: "Adults 18 and over." },
  { q: "Do I need an app?", a: "No download. Colgrid opens in your phone's browser at colgrid.app, and you can add it to your home screen." },
];

export const FULL_FAQ: Faq[] = [
  {
    q: "What is Colgrid?",
    a: "Colgrid is a real-world game you play with friends. Pick a route, go to each stop together, take on the mission there, and earn XP. Your level and badges carry forward to every route and every city.",
  },
  ...HOME_FAQ,
  { q: "Is there a host?", a: "No. Your phone tells you where to go and checks that you're there. Stops are local businesses and public places." },
  {
    q: "Is it competitive?",
    a: "No. Nobody is ranked, and there's no race against other teams. Everyone earns XP and badges that carry forward.",
  },
  {
    q: "Can we book a private run for our company?",
    a: "Yes. Private runs start at $2,500 for up to 20 players, plus $95 per extra player. See the Companies page to get a quote.",
  },
];
