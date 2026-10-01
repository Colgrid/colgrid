import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import LegalFooter from "@/app/components/LegalFooter";
import { HOME_FAQ } from "@/lib/faq";
import { SITE } from "@/lib/site";

// The home page sells the player experience to someone who has never heard of Colgrid:
// what it is, how it works, and how progress carries on. No tickets, no dates: Colgrid is a game
// you play with friends whenever the places are open (Open Play, decided Oct 1, 2026).
// Companies, hosts and the full FAQ have their own pages.

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

const STEPS = [
  { title: "Pick a route.", body: "A few stops through one neighborhood." },
  { title: "Bring your friends.", body: "Start a team and send them one link." },
  { title: "Take on missions.", body: "Your phone shows where to go and checks you're there." },
  { title: "Earn XP.", body: "Levels and badges that stay with you." },
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
      mainEntity: HOME_FAQ.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    },
  ],
};

export default function Home() {
  return (
    <main className="page home">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />

      <span className="logo-tile logo-tile--sm">
        {/* Scaled inside the tile to trim the file's white margin. The logo itself is unchanged. */}
        <Image src="/brand/colgrid-logo.png" alt="Colgrid" width={48} height={48} priority style={{ transform: "scale(1.7)" }} />
      </span>

      {/* 1. Hero */}
      <section className="home-hero">
        <h1>Turn your city into a game board.</h1>
        <p className="home-lede">Colgrid is a real-world game you play with friends. Pick a route, take on missions, discover local places, earn XP.</p>
        <p className="home-when">Opening soon in Salt Lake City.</p>
        <a href={`${SITE.appUrl}/signin`} className="home-quiet">
          Open your pass →
        </a>
      </section>

      {/* 2. What is Colgrid? */}
      <section className="home-section" aria-labelledby="what">
        <h2 id="what">A game you can play any day.</h2>
        <p>
          Routes run through one neighborhood, with stops at local makers, kitchens and places you&apos;d normally walk right past. No host, no
          schedule: go when your friends are free and the places are open.
        </p>
      </section>

      {/* 3. How it works */}
      <section className="home-section" aria-labelledby="how">
        <h2 id="how">How it works</h2>
        <ol className="home-steps">
          {STEPS.map((s, i) => (
            <li key={s.title}>
              <span className="mono home-steps__n" aria-hidden="true">
                {i + 1}
              </span>
              <span>
                <strong>{s.title}</strong> {s.body}
              </span>
            </li>
          ))}
        </ol>
      </section>

      {/* 5. Progress */}
      <section className="home-section" aria-labelledby="progress">
        <h2 id="progress">Your progress follows you.</h2>
        <p>Earn XP and badges as you play. They carry into every route, and every city.</p>
      </section>

      {/* 6. FAQ */}
      <section className="home-section" aria-labelledby="faq">
        <h2 id="faq">Questions</h2>
        <div className="faq">
          {HOME_FAQ.map((f) => (
            <details key={f.q}>
              <summary>{f.q}</summary>
              <p>{f.a}</p>
            </details>
          ))}
        </div>
        <Link href="/faq" className="home-quiet">
          More questions →
        </Link>
      </section>

      <LegalFooter social />
    </main>
  );
}
