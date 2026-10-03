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
            We organize everyday citizens to solve urgent local challenges, delivering real, measurable field impact for the organizations funding
            change.
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
          <Image src={CHALLENGE.heroPhoto} alt={CHALLENGE.heroPhotoAlt} width={1408} height={768} priority sizes="(min-width: 860px) 480px, 100vw" />
          <div className="mission">
            <span className="mono mission__n">THE ASK</span>
            <p className="mission__text">{CHALLENGE.examples[0].ask}</p>
          </div>
        </div>
      </section>

      {/* B. Core model */}
      <section className="home-section" aria-labelledby="model">
        <h2 id="model">From talking to doing.</h2>
        <p className="show-wide">
          Most people want to make a difference where they live, but sign-up sheets and endless meetings don&apos;t get results. Colgrid turns
          community challenges into structured, collective action. Organizations fund the initiative to get real field work done. Neighbors step up
          to take direct action together.
        </p>
      </section>

      {/* C. Organizations and residents */}
      <section className="audience" aria-label="Who Colgrid is for">
        <div>
          <p className="audience__who">For organizations, business districts, nonprofits and cities</p>
          <h2>Get the field work done</h2>
          <ul>
            <li>
              <strong>A field force that shows up</strong>
              Stop paying for unmeasured ads or begging for volunteers who don&apos;t show up. Hire Colgrid to deploy a coordinated field force of local
              residents directly to the problem area.
            </li>
            <li>
              <strong>Hard proof</strong>
              Verified field data, completed asks and an official Outcome Report to prove real impact to boards, grantors and city leaders.
            </li>
          </ul>
          <a href="#commission" className="button button--primary">
            Request an action plan
          </a>
        </div>
        <div>
          <p className="audience__who">For neighbors</p>
          <h2>Fix it together</h2>
          <ul>
            <li>
              <strong>Skip the talking</strong>
              Skip the committee meetings, donation links and internet debates.
            </li>
            <li>
              <strong>Do the work</strong>
              Get outdoors with friends and neighbors to do direct work that makes an immediate difference.
            </li>
            <li>
              <strong>Share in what you create</strong>
              Guaranteed rewards for completing the asks, rewards from local businesses, and a share of the bonus when the challenge hits its target.
            </li>
          </ul>
          <a href={`${SITE.appUrl}/signin`} className="button button--secondary">
            Take action in your area
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
