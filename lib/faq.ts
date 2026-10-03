// Questions shown on the home page (the short list) and on /faq (everything).
// Facts come from the night's details in lib/site.ts (NIGHT).
export type Faq = { q: string; a: string };

export const HOME_FAQ: Faq[] = [
  { q: "Can I come alone?", a: "Yes. Most people do. You're placed on a team as soon as you arrive." },
  { q: "Is this speed dating?", a: "No. You play quick games in teams, so you meet people while doing something together." },
  { q: "Who is it for?", a: "Singles ages 21 to 35. Bring your ID: the venue is 21 and over." },
  { q: "Are drinks included?", a: "No. The bar is open all night and you buy what you like." },
];

export const FULL_FAQ: Faq[] = [
  {
    q: "What is Colgrid?",
    a: "Colgrid runs hosted social nights in Salt Lake City. We mix you into small teams and give you something to do together, so you meet new people without the awkward part.",
  },
  ...HOME_FAQ,
  {
    q: "What happens on the night?",
    a: "You're put on a team of six people you haven't met. For the first hour your team plays quick, easy games. Teams reshuffle twice, so you meet about 18 people. After that the music comes up and the rest of the night is yours.",
  },
  { q: "What kind of games?", a: "Quick, easy team games. Nothing athletic, and nothing that puts you on the spot." },
  { q: "Why are there separate men's and women's tickets?", a: "To keep the room evenly balanced. Both cost the same." },
  { q: "Can I buy a ticket at the door?", a: "Yes, for $29 if there's room. Tickets cost less in advance." },
  { q: "What should I wear?", a: "Whatever you'd wear on a night out." },
  {
    q: "Can we book a private night for our company?",
    a: "Yes. Private runs start at $2,500 for up to 20 players, plus $95 per extra player. See the Companies page to get a quote.",
  },
];

// Questions on /how-it-works (blueprint of Oct 2, 2026).
export const CHALLENGE_FAQ: Faq[] = [
  { q: "Who takes part?", a: "Everyday residents who live nearby and want to take direct action. We recruit them through flyers, social media and local outreach. You don't need to bring a crowd." },
  { q: "Who pays?", a: "The organization that commissions the challenge. Residents take part for free." },
  { q: "What is in the Outcome Report?", a: "Verified field data: check-ins, sites audited, completed actions and what participants told us. Organizations use it to prove impact to boards, grantors and city officials." },
  { q: "What kinds of problems work?", a: "Problems that need many people each doing a small, physical task: inspect, count, map, collect, visit. If we can't measure it, we'll say so before you pay." },
  { q: "How do we pay?", a: "50% deposit at signing. The other 50% is due within 15 days of your Outcome Report." },
];
