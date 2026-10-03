import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import LeadForm from "@/app/components/LeadForm";
import LegalFooter from "@/app/components/LegalFooter";
import { CHALLENGE_FAQ } from "@/lib/faq";
import { CHALLENGE, SITE } from "@/lib/site";

// The home page speaks to the organization with a goal (decided Oct 2, 2026): what a challenge is,
// how it works, what the report shows, what it costs, and a form to start a conversation.
// Hosted nights for players live on /nights.

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

const STEPS = [
  { title: "Tell us the goal.", body: "More people in your shops, your district or your new project." },
  { title: "We build the game.", body: "Team missions that can only be finished by doing the thing you need." },
  { title: "We bring the players.", body: "People sign up because it's a good afternoon out." },
  { title: "You get the proof.", body: "A report of what happened, within a week." },
];

const REPORT = [
  { label: "Players", body: "How many people played, and in how many teams." },
  { label: "Places", body: "Which stops they visited, and how many times." },
  { label: "First visits", body: "How many were there for the first time." },
  { label: "Missions", body: "What they finished at each stop." },
  { label: "Feedback", body: "What they told us, in their own words." },
];

const WHO = [
  { title: "Business districts.", body: "Bring people back during road work, slow seasons or after a reopening." },
  { title: "Developers and property owners.", body: "Help the neighborhood discover a new project, and help new residents feel at home." },
  { title: "Community organizations.", body: "Get people to show up, take part and tell you what they think." },
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
    <main className="page home">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />

      <span className="logo-tile logo-tile--sm">
        {/* Scaled inside the tile to trim the file's white margin. The logo itself is unchanged. */}
        <Image src="/brand/colgrid-logo.png" alt="Colgrid" width={48} height={48} priority style={{ transform: "scale(1.7)" }} />
      </span>

      {/* 1. Hero */}
      <section className="home-hero">
        <h1>{SITE.tagline}</h1>
        <p className="home-lede">
          Colgrid builds real-world team challenges in Salt Lake City. We design it, bring the players and show you what happened.
        </p>
        <a href="#talk" className="button button--primary home-cta">
          Start a conversation
        </a>
      </section>

      {/* 2. How it works */}
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

      {/* 3. Why */}
      <section className="home-section" aria-labelledby="why">
        <h2 id="why">Asking people to care doesn&apos;t work.</h2>
        <p>
          Giving them something to do does. A team with a mission will walk into a shop it has passed a hundred times. That visit is the result you
          were paying for.
        </p>
      </section>

      {/* 4. The report */}
      <section className="home-section" aria-labelledby="report">
        <h2 id="report">What your report shows</h2>
        <dl className="home-facts">
          {REPORT.map((r) => (
            <div key={r.label}>
              <dt>{r.label}</dt>
              <dd>{r.body}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* 5. Who it's for */}
      <section className="home-section" aria-labelledby="who">
        <h2 id="who">Who it&apos;s for</h2>
        <ul className="home-included">
          {WHO.map((w) => (
            <li key={w.title}>
              <strong>{w.title}</strong> {w.body}
            </li>
          ))}
        </ul>
      </section>

      {/* 6. Prices */}
      <section className="home-section" aria-labelledby="prices">
        <h2 id="prices">Prices</h2>
        <dl className="home-facts">
          {CHALLENGE.plans.map((p) => (
            <div key={p.name}>
              <dt>{p.name}</dt>
              <dd>
                <span className="mono">{p.price}</span>
                <small>{p.note}</small>
              </dd>
            </div>
          ))}
        </dl>
      </section>

      {/* 7. FAQ */}
      <section className="home-section" aria-labelledby="faq">
        <h2 id="faq">Questions</h2>
        <div className="faq">
          {CHALLENGE_FAQ.map((f) => (
            <details key={f.q}>
              <summary>{f.q}</summary>
              <p>{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* 8. Start */}
      <section className="home-section" aria-labelledby="talk">
        <h2 id="talk">Tell us what you need.</h2>
        <p>We answer within two days.</p>
        <LeadForm kind="corporate" challenge />
      </section>

      {/* 9. Players */}
      <section className="home-section" aria-labelledby="play">
        <h2 id="play">Here to play?</h2>
        <Link href="/nights" className="home-quiet">
          See the next night →
        </Link>
      </section>

      <LegalFooter social />
    </main>
  );
}
