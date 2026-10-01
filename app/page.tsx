import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import LegalFooter from "@/app/components/LegalFooter";
import { HOME_FAQ } from "@/lib/faq";
import { SITE } from "@/lib/site";

// The home page sells the player experience to someone who has never heard of Colgrid:
// what it is, why play, the next gathering, how it works, and how progress carries on.
// Companies, hosts and the full FAQ have their own pages.

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

const STEPS = [
  { title: "Meet your team.", body: "Come with friends, or solo and we'll place you." },
  { title: "Take on missions.", body: "Make something, taste something, solve something." },
  { title: "Discover the neighborhood.", body: "Places you'd normally walk right past." },
  { title: "Earn XP.", body: "Every mission counts." },
];

const INCLUDED = ["3–4 hosted missions", "Local tastings", "Finale meal", "A keepsake to take home", "About 3 hours", "One walkable neighborhood"];

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

const next = SITE.nextGathering;

// Listed for search engines only once tickets are open (the Eventbrite page stays private until then).
const eventLd = next.ticketsOpen
  ? {
      "@type": "Event",
      "@id": `${SITE.url}/#next-gathering`,
      name: next.name,
      startDate: next.startsAt,
      endDate: next.endsAt,
      eventStatus: "https://schema.org/EventScheduled",
      eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
      location: { "@type": "Place", name: `${next.neighborhood}, Salt Lake City`, address: { "@type": "PostalAddress", addressLocality: "Salt Lake City", addressRegion: "UT", addressCountry: "US" } },
      organizer: { "@id": `${SITE.url}/#organization` },
      typicalAgeRange: "18-",
      offers: { "@type": "Offer", price: next.price, priceCurrency: "USD", url: next.ticketUrl, availability: "https://schema.org/InStock" },
    }
  : null;

export default function Home() {
  const structured = eventLd ? { ...jsonLd, "@graph": [...jsonLd["@graph"], eventLd] } : jsonLd;
  const day = next.when.split(" · ")[0]; // "Saturday, October 17"
  const shortDay = day.split(", ")[1] ?? day; // "October 17"
  return (
    <main className="page home">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structured).replace(/</g, "\\u003c") }} />

      <span className="logo-tile logo-tile--sm">
        {/* Scaled inside the tile to trim the file's white margin. The logo itself is unchanged. */}
        <Image src="/brand/colgrid-logo.png" alt="Colgrid" width={48} height={48} priority style={{ transform: "scale(1.7)" }} />
      </span>

      {/* 1. Hero */}
      <section className="home-hero">
        <h1>Turn your city into a game board.</h1>
        <p className="home-lede">Colgrid is a real-world team game. Take on missions. Discover local places. Earn XP.</p>
        <p className="home-when">
          <strong>{next.when}</strong>
          <br />
          {next.neighborhood} · Salt Lake City
          <br />${next.price} · Adults 18+
        </p>
        {next.ticketsOpen ? (
          <a href={next.ticketUrl} className="button button--primary home-cta" rel="noopener">
            Get tickets · ${next.price}
          </a>
        ) : (
          <p className="mono home-soon">TICKETS OPEN SOON</p>
        )}
        <a href={`${SITE.appUrl}/signin`} className="home-quiet">
          Open your pass →
        </a>
      </section>

      {/* 2. What is Colgrid? */}
      <section className="home-section" aria-labelledby="what">
        <h2 id="what">A night out that&apos;s actually a game.</h2>
        <p>
          You and your team explore one neighborhood, taking on missions hosted by local makers, kitchens and guides. Your phone shows you
          where to go next.
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

      {/* 4. The next gathering */}
      <section className="home-section" aria-labelledby="next">
        <h2 id="next">
          {shortDay} · {next.neighborhood}
        </h2>
        <ul className="home-included">
          {INCLUDED.map((x) => (
            <li key={x}>{x}</li>
          ))}
        </ul>
        <p className="home-note">The exact start spot drops 48 hours before.</p>
        {next.ticketsOpen && (
          <a href={next.ticketUrl} className="button button--primary home-cta" rel="noopener">
            Get tickets · ${next.price}
          </a>
        )}
      </section>

      {/* 5. Progress */}
      <section className="home-section" aria-labelledby="progress">
        <h2 id="progress">Your progress follows you.</h2>
        <p>Earn XP and badges as you play. They carry into every future Colgrid gathering, and every city.</p>
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
