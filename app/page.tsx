import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import LeadForm from "@/app/components/LeadForm";
import LegalFooter from "@/app/components/LegalFooter";
import OutcomeReport from "@/app/components/OutcomeReport";
import { CHALLENGE, SITE } from "@/lib/site";

// The home page follows the Oct 2, 2026 blueprint: lead generation for organizations that fund a
// challenge, with a second path for residents. Hero, core model, organizations vs. residents,
// what we solve, outcome report, lead form. Not a game: no game, mission, XP or player language.

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

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

      {/* A. Hero */}
      <section className="show-hero">
        <div>
          <h1>{SITE.tagline}</h1>
          <p className="home-lede">
            Colgrid organizes everyday citizens to solve urgent local challenges, delivering measurable field impact for the organizations funding
            real change.
          </p>
          <div className="show-ctas">
            <a href="#commission" className="button button--primary">
              Commission a challenge
            </a>
            <a href={`${SITE.appUrl}/signin`} className="button button--secondary">
              Take action in your area
            </a>
          </div>
        </div>
        <div className="show-visual">
          <Image src={CHALLENGE.heroPhoto} alt={CHALLENGE.heroPhotoAlt} width={1200} height={700} priority sizes="(min-width: 860px) 480px, 100vw" />
          <div className="mission">
            <span className="mono mission__n">THE ASK</span>
            <p className="mission__text">{CHALLENGE.examples[0].ask}</p>
          </div>
        </div>
      </section>

      {/* B. Core model */}
      <section className="home-section" aria-labelledby="model">
        <h2 id="model">Mobilizing communities to solve real social problems</h2>
        <p className="show-wide">
          When local organizations need real-world results, whether auditing street safety, logging environmental damage or driving foot traffic back
          into hard-hit neighborhoods, posting ads or begging for volunteers isn&apos;t enough. Colgrid provides paid, structured field operations.
          Organizations fund the initiative to get real results. Neighbors step up to take direct action where they live.
        </p>
      </section>

      {/* C. Organizations and residents */}
      <section className="audience" aria-label="Who Colgrid is for">
        <div>
          <p className="audience__who">For organizations and decision-makers</p>
          <h2>Fund verified, on-the-ground action</h2>
          <ul>
            <li>
              <strong>Grassroots execution at scale</strong>
              Hire Colgrid to deploy local residents directly to the problem area to execute targeted field tasks.
            </li>
            <li>
              <strong>Hard data and proof of impact</strong>
              Receive an Outcome Report showing GPS check-ins, audited sites, crowd feedback and verified completed actions.
            </li>
          </ul>
          <a href="#commission" className="button button--primary">
            Request an action plan
          </a>
        </div>
        <div>
          <p className="audience__who">For local residents</p>
          <h2>Become a force for grassroots change</h2>
          <ul>
            <li>
              <strong>Direct local impact</strong>
              Skip the endless committee meetings. Get out in your neighborhood and do the hands-on work that drives real policy and community fixes.
            </li>
            <li>
              <strong>Power in numbers</strong>
              Join structured, team-based mobilizations, from mapping unsafe intersections to supporting local resilience hubs, and hold leaders
              accountable with real evidence.
            </li>
          </ul>
          <a href={`${SITE.appUrl}/signin`} className="button button--secondary">
            Join the next deployment
          </a>
        </div>
      </section>

      {/* D. What we solve */}
      <section className="home-section" aria-labelledby="solve">
        <h2 id="solve">What we solve</h2>
        <ul className="cards cards--two">
          {CHALLENGE.examples.map((c) => (
            <li key={c.title}>
              <div className={`card__art card__art--${c.tone}`}>
                {c.photo && <Image src={c.photo} alt="" fill sizes="(min-width: 600px) 320px, 78vw" />}
                <span className="mono mission__n">THE ASK</span>
                <p className="mission__text">{c.ask}</p>
              </div>
              <h3 className="card__title">{c.title}</h3>
              <p className="card__body">{c.body}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* E. Outcome and proof */}
      <section className="home-section" aria-labelledby="proof">
        <h2 id="proof">From field action to real policy and results</h2>
        <p className="show-wide">
          Every funded challenge produces verified field data, completed objectives and an official Outcome Report that organizations use to prove
          impact to boards, grantors and city officials.
        </p>
        <OutcomeReport />
        <Link href="/how-it-works" className="home-quiet">
          How it works →
        </Link>
      </section>

      {/* F. Lead form */}
      <section className="home-section show-form" aria-labelledby="commission">
        <h2 id="commission">Commission a challenge</h2>
        <p>Thirty seconds. We reply within two days to set up a 20-minute strategy call.</p>
        <LeadForm kind="corporate" challenge />
        <Link href="/pricing" className="home-quiet">
          See pricing →
        </Link>
      </section>

      <LegalFooter social />
    </main>
  );
}
