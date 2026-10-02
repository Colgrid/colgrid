import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import LegalFooter from "@/app/components/LegalFooter";
import { HOME_FAQ } from "@/lib/faq";
import { NIGHT, SITE } from "@/lib/site";

// The home page has one job: get someone who has never heard of Colgrid to the next night.
// What Colgrid is, the next night, how it goes, why it exists, questions. Tickets are sold on
// Eventbrite (hosted social nights, decided Oct 1, 2026). The night's details live in lib/site.ts.

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

const STEPS = [
  { title: "Show up.", body: "Come on your own or bring a single friend." },
  { title: "Get your team.", body: "Six people you haven't met yet." },
  { title: "Play.", body: "Quick, easy games. Teams reshuffle twice, so you meet about 18 people." },
  { title: "Stay.", body: "The music comes up, the bar's open, and the night is yours." },
];

const ticketUrl = NIGHT.ticketUrl || NIGHT.organizerUrl;
const where = NIGHT.venueConfirmed ? `${NIGHT.venue}, ${NIGHT.area}` : NIGHT.area;

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
        <h1>Come alone. Leave knowing people.</h1>
        <p className="home-lede">Colgrid runs hosted nights in Salt Lake City that make meeting new people easy.</p>
        <p className="home-when">
          <strong>{NIGHT.name}</strong>
          <br />
          {NIGHT.shortDate} · {NIGHT.time} · {NIGHT.area}
        </p>
        <a href={ticketUrl} className="button button--primary home-cta" rel="noopener" target="_blank">
          Get tickets
        </a>
      </section>

      {/* 2. The next night */}
      <section className="home-section" aria-labelledby="next">
        <h2 id="next">The next night</h2>
        <p>
          You&apos;re put on a team of six strangers for an hour of quick, silly games. Then the bar and the music take over. No apps. No awkward one-on-one interviews.
        </p>
        <dl className="home-facts">
          <div>
            <dt>When</dt>
            <dd>
              {NIGHT.date}, {NIGHT.time}
              <small>{NIGHT.doors}</small>
            </dd>
          </div>
          <div>
            <dt>Where</dt>
            <dd>
              {where}
              {NIGHT.venueConfirmed && <small>{NIGHT.venueAddress}</small>}
            </dd>
          </div>
          <div>
            <dt>Who</dt>
            <dd>
              {NIGHT.ages}
              <small>21 and over. Bring your ID.</small>
            </dd>
          </div>
          <div>
            <dt>Tickets</dt>
            <dd>
              {NIGHT.prices.map((p) => (
                <span key={p.label} className="home-facts__price">
                  <span className="mono">{p.price}</span> {p.label}
                  {p.note && <small> {p.note}</small>}
                </span>
              ))}
            </dd>
          </div>
        </dl>
      </section>

      {/* 3. How it goes */}
      <section className="home-section" aria-labelledby="how">
        <h2 id="how">How it goes</h2>
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

      {/* 4. Why */}
      <section className="home-section" aria-labelledby="why">
        <h2 id="why">Meeting people shouldn&apos;t be this hard.</h2>
        <p>
          Apps haven&apos;t made it easier. People connect faster when they&apos;re doing something together, so every Colgrid night is hosted and gives you something to do.
        </p>
      </section>

      {/* 5. FAQ */}
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

      {/* 6. Can't make it */}
      <section className="home-section" aria-labelledby="later">
        <h2 id="later">Can&apos;t make this one?</h2>
        <p>Tell us, and we&apos;ll let you know when the next night is set.</p>
        <Link href="/contact" className="home-quiet">
          Send us a note →
        </Link>
      </section>

      <LegalFooter social />
    </main>
  );
}
