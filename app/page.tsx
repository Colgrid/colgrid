import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { SITE } from "@/lib/site";

// Public home page. The full version is step 7 of docs/mvp-spec.md; this one already carries the
// words search engines and AI assistants read: what Colgrid is, how it works, prices and an FAQ.
// Facts come from docs/game-design.md, docs/pricing.md and docs/brand-identity.md.

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

const HOW_IT_WORKS = [
  {
    title: "Join a team",
    body: "Bring friends or come solo. Solo players get placed on a team, and that team is waiting for you next time.",
  },
  {
    title: "Get the location",
    body: "The starting point drops 24–48 hours before. Then you meet your team in one walkable neighborhood for 2–4 hours.",
  },
  {
    title: "Take on missions",
    body: "Quests hosted by local makers, kitchens and guides: make something, taste something, find a place you'd never find alone.",
  },
  {
    title: "Level up",
    body: "Every quest earns XP. Your level, badges and team history follow you to every gathering and every city.",
  },
];

const FAQ = [
  {
    q: "What is Colgrid?",
    a: "Colgrid is a real-world team game that turns a city into missions: hidden places, local makers, and challenges you'd never try alone. Your team, your level and your badges carry forward to every gathering and every city, building toward an annual flagship.",
  },
  {
    q: "Where does it happen?",
    a: "Chapter 01 is Salt Lake City. Each gathering takes place in one walkable neighborhood, and the starting location is revealed 24–48 hours before.",
  },
  {
    q: "How much does it cost?",
    a: "$75 per player. A ticket includes 3–4 hosted quests and all materials, a finale meal and first drink, a numbered session badge, and your web pass with XP, levels and badges.",
  },
  {
    q: "Who can play?",
    a: "Adults 18 and over. Come with friends, a partner, family, coworkers, or on your own.",
  },
  {
    q: "Do I need a team?",
    a: "No. Bring friends or come solo. Solo players are placed on a team.",
  },
  {
    q: "Is it competitive?",
    a: "Only if you want it to be. Every team plays casually by default, and nobody is ranked. Teams can opt into the tournament before the season's second session to climb the chapter standings, play the Chapter Finals and go for the Championship. Entering the tournament costs nothing extra.",
  },
  {
    q: "How long is a gathering?",
    a: "2–4 hours, with 30–50 players in teams.",
  },
];

// Structured data (schema.org) so search engines and AI assistants can read the facts directly.
const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${SITE.url}/#organization`,
      name: SITE.name,
      url: SITE.url,
      logo: `${SITE.url}/brand/colgrid-logo.png`,
      email: SITE.email,
      description: SITE.description,
      sameAs: SITE.social.map((s) => s.url),
      areaServed: { "@type": "City", name: SITE.city, containedInPlace: { "@type": "State", name: "Utah" } },
    },
    {
      "@type": "WebSite",
      "@id": `${SITE.url}/#website`,
      name: SITE.name,
      url: SITE.url,
      description: SITE.shortDescription,
      publisher: { "@id": `${SITE.url}/#organization` },
      inLanguage: "en-US",
    },
    {
      "@type": "FAQPage",
      "@id": `${SITE.url}/#faq`,
      mainEntity: FAQ.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    },
  ],
};

export default function Home() {
  return (
    <main className="page">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />

      <span className="logo-tile">
        {/* Scaled inside the tile to trim the file's white margin, as in the mockups. The logo itself is unchanged. */}
        <Image src="/brand/colgrid-logo.png" alt="Colgrid" width={96} height={96} priority style={{ transform: "scale(1.7)" }} />
      </span>

      <p className="mono" style={{ color: "var(--chapter-teal)", letterSpacing: "0.12em", fontSize: 13, marginTop: 28 }}>
        CHAPTER 01 · SALT LAKE CITY
      </p>
      <h1 style={{ fontSize: 44, marginTop: 8 }}>{SITE.tagline}</h1>
      <p style={{ fontSize: 18, lineHeight: 1.45, color: "var(--ink-muted)", marginTop: 16 }}>
        Colgrid is a real-world team game. Meet your team in one walkable neighborhood. Take on missions hosted by local makers,
        kitchens and guides. Your XP follows you to every city.
      </p>

      <div style={{ display: "flex", gap: 8, marginTop: 20 }}>
        <span className="chip chip--casual">CASUAL</span>
        <span className="chip chip--tournament">TOURNAMENT</span>
      </div>

      <p style={{ fontSize: 16, lineHeight: 1.45, color: "var(--ink-subtle)", marginTop: 32 }}>
        The first Colgrid gathering is coming to 9th & 9th in October. Tickets are $75 and open soon.
      </p>

      <Link href="/signin" className="button button--secondary" style={{ marginTop: 24 }}>
        Have a ticket? Open your pass
      </Link>

      <section className="section" aria-labelledby="how">
        <h2 id="how" className="mono home-kicker">
          HOW IT WORKS
        </h2>
        <ol className="steps">
          {HOW_IT_WORKS.map((s, i) => (
            <li key={s.title}>
              <span className="steps__num mono" aria-hidden="true">
                {String(i + 1).padStart(2, "0")}
              </span>
              <div>
                <h3>{s.title}</h3>
                <p>{s.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="section" aria-labelledby="faq">
        <h2 id="faq" className="mono home-kicker">
          QUESTIONS
        </h2>
        <div className="faq">
          {FAQ.map((f) => (
            <details key={f.q}>
              <summary>{f.q}</summary>
              <p>{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      <footer className="home-footer">
        <ul className="social" aria-label="Colgrid elsewhere">
          {SITE.social.map((s) => (
            <li key={s.name}>
              <a href={s.url} rel="me noopener" target="_blank">
                {s.name}
              </a>
            </li>
          ))}
        </ul>
        <p>
          Colgrid · Chapter 01: Salt Lake City · <a href={`mailto:${SITE.email}`}>{SITE.email}</a>
        </p>
      </footer>
    </main>
  );
}
