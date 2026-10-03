import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import LeadForm from "@/app/components/LeadForm";
import LegalFooter from "@/app/components/LegalFooter";
import { CHALLENGE_FAQ } from "@/lib/faq";
import { CHALLENGE, SITE } from "@/lib/site";

// The home page is about grassroots community change (decided Oct 2, 2026): a community organization
// brings a problem and pays, neighbors take part because they care. This is not a game: no game,
// mission, XP or player language here. It shows instead
// of tells: what people are asked to do, over a photo of people, a grid of example challenges, a sample report, three prices,
// a form. Keep words to a minimum; if something needs explaining, show it. Nights live on /nights.

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

const maxVisits = Math.max(...CHALLENGE.sample.stops.map((s) => s.visits));

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
      mainEntity: CHALLENGE_FAQ.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    },
  ],
};

export default function Home() {
  return (
    <main className="page home home--wide">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />

      <span className="logo-tile logo-tile--sm">
        {/* Scaled inside the tile to trim the file's white margin. The logo itself is unchanged. */}
        <Image src="/brand/colgrid-logo.png" alt="Colgrid" width={48} height={48} priority style={{ transform: "scale(1.7)" }} />
      </span>

      {/* 1. Hero: the headline, and a picture of the product at work */}
      <section className="show-hero">
        <div>
          <h1>{SITE.tagline}</h1>
          <p className="home-lede">Community organizations bring the challenge. Neighbors do the work.</p>
          <a href="#talk" className="button button--primary home-cta">
            Start a conversation
          </a>
        </div>
        <div className="show-visual">
          <Image src={CHALLENGE.heroPhoto} alt={CHALLENGE.heroPhotoAlt} width={1200} height={700} priority sizes="(min-width: 860px) 480px, 100vw" />
          <div className="mission">
            <span className="mono mission__n">THE ASK</span>
            <p className="mission__text">{CHALLENGE.examples[0].ask}</p>
          </div>
        </div>
      </section>

      {/* 2. Example challenges, as cards */}
      <section className="home-section" aria-labelledby="challenges">
        <h2 id="challenges">Pick a challenge.</h2>
        <ul className="cards">
          {CHALLENGE.examples.map((c) => (
            <li key={c.title}>
              <div className={`card__art card__art--${c.tone}`}>
                {c.photo && <Image src={c.photo} alt="" fill sizes="(min-width: 600px) 320px, 78vw" />}
                <span className="mono mission__n">THE ASK</span>
                <p className="mission__text">{c.ask}</p>
              </div>
              <h3 className="card__title">{c.title}</h3>
              <p className="card__meta">{c.who}</p>
              <p className="card__price">
                From <strong>{CHALLENGE.plans[0].price}</strong>
              </p>
            </li>
          ))}
        </ul>
      </section>

      {/* 3. The report, shown */}
      <section className="home-section" aria-labelledby="report">
        <h2 id="report">See what changed.</h2>
        <div className="report">
          <div className="report__head">
            <span>Challenge report</span>
            <span className="report__tag">Sample</span>
          </div>
          <dl className="report__stats">
            {CHALLENGE.sample.stats.map((s) => (
              <div key={s.label}>
                <dt>{s.label}</dt>
                <dd>{s.n}</dd>
              </div>
            ))}
          </dl>
          <p className="report__sub">{CHALLENGE.sample.barsLabel}</p>
          <ul className="report__bars" aria-label={CHALLENGE.sample.barsLabel}>
            {CHALLENGE.sample.stops.map((s) => (
              <li key={s.name}>
                <span>{s.name}</span>
                <span>
                  <i style={{ width: `${Math.round((s.visits / maxVisits) * 100)}%` }} />
                </span>
                <span>{s.visits}</span>
              </li>
            ))}
          </ul>
          <p className="report__quote">{CHALLENGE.sample.quote}</p>
        </div>
      </section>

      {/* 4. Prices */}
      <section className="home-section" aria-labelledby="prices">
        <h2 id="prices">Three ways to start.</h2>
        <ul className="plans">
          {CHALLENGE.plans.map((p) => (
            <li key={p.name}>
              <strong>{p.name}</strong>
              <span className="mono">{p.price}</span>
              <small>{p.note}</small>
            </li>
          ))}
        </ul>
      </section>

      {/* 5. Start */}
      <section className="home-section show-form" aria-labelledby="talk">
        <h2 id="talk">Bring us a problem.</h2>
        <LeadForm kind="corporate" challenge />
      </section>

      {/* 6. Questions, collapsed */}
      <section className="home-section show-form" aria-labelledby="faq">
        <h2 id="faq">Questions</h2>
        <div className="faq">
          {CHALLENGE_FAQ.map((f) => (
            <details key={f.q}>
              <summary>{f.q}</summary>
              <p>{f.a}</p>
            </details>
          ))}
        </div>
        <Link href="/nights" className="home-quiet">
          Looking for the singles night? →
        </Link>
      </section>

      <LegalFooter social />
    </main>
  );
}
