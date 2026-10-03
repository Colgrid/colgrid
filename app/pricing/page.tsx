import type { Metadata } from "next";
import Link from "next/link";
import LegalFooter from "@/app/components/LegalFooter";
import { CHALLENGE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Pricing",
  description: "Colgrid pricing: Pilot Challenge $1,500, Standard Challenge $3,500, Campaign Contract $2,500 a month.",
  alternates: { canonical: "/pricing" },
};

export default function Pricing() {
  return (
    <main className="page home home--wide">
      <section className="home-hero">
        <h1>Pricing</h1>
        <p className="home-lede">{CHALLENGE.terms}</p>
      </section>
      <section className="home-section" aria-label="Plans" style={{ marginTop: 40 }}>
        <ul className="plans">
          {CHALLENGE.plans.map((p) => (
            <li key={p.name}>
              <strong>{p.name}</strong>
              <span className="mono">{p.price}</span>
              <small>{p.note}</small>
            </li>
          ))}
        </ul>
        <Link href="/#commission" className="button button--primary home-cta">
          Commission a challenge
        </Link>
      </section>
      <LegalFooter />
    </main>
  );
}
