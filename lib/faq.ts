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

// Questions on the home page (challenges for organizations, Oct 2, 2026).
export const CHALLENGE_FAQ: Faq[] = [
  { q: "Who takes part?", a: "People who live nearby and want to help. We recruit them and put them in teams. You don't need to bring a crowd." },
  { q: "Who pays?", a: "The community organization that owns the problem. Taking part is free or low-cost for neighbors." },
  { q: "What do we get at the end?", a: "A report: how many people took part, what they did, what they found and what they told us." },
  { q: "What kinds of problems work?", a: "Problems that get better when a lot of people each do something small: clean, count, map, plant, collect, visit, meet. If we can't measure it, we'll say so before you pay." },
  { q: "How long does it take to set up?", a: "About four weeks from a first call to challenge day." },
];
