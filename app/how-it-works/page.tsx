import type { Metadata } from "next";
import Link from "next/link";
import LegalFooter from "@/app/components/LegalFooter";
import OutcomeReport from "@/app/components/OutcomeReport";
import { CHALLENGE_FAQ } from "@/lib/faq";
import { CHALLENGE } from "@/lib/site";

export const metadata: Metadata = {
  title: "How it works",
  description: "From a 20-minute call to a verified Outcome Report: how a Colgrid challenge is scoped, staffed with local residents and run in the field.",
  alternates: { canonical: "/how-it-works" },
};

const STEPS = [
  { title: "Book a call.", body: "Fill in the 30-second form. We set up a 20-minute strategy call." },
  { title: "Scope it.", body: "Together we confirm the objective, define the field tasks, set the date and agree what the report will measure." },
  { title: "Sign and deposit.", body: `A one-page agreement. ${CHALLENGE.terms}` },
  { title: "We mobilize.", body: "We set up your challenge on colgrid.app and recruit residents through flyers, social media and local outreach." },
  { title: "Challenge day.", body: "Residents join alone or as a team, open the field map, complete tasks, check in by GPS and submit photos and logs." },
  { title: "Outcome Report.", body: "The field data is compiled into your report: check-ins, sites audited, completed actions and feedback." },
];

export default function HowItWorks() {
  return (
    <main className="page home home--wide">
      <section className="home-hero">
        <h1>How it works</h1>
        <p className="home-lede">From a first call to verified results in the field.</p>
      </section>

      <section className="home-section show-form" aria-label="Steps">
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

      <section className="home-section" aria-labelledby="report">
        <h2 id="report">What you receive</h2>
        <OutcomeReport />
      </section>

      <section className="home-section show-form" aria-labelledby="safety">
        <h2 id="safety">Safety</h2>
        <p>Field tasks are agreed with you before the day, done in teams and in public places. Every participant accepts the terms before taking part.</p>
      </section>

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
        <Link href="/#commission" className="button button--primary home-cta">
          Commission a challenge
        </Link>
      </section>

      <LegalFooter />
    </main>
  );
}
