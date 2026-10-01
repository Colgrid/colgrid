import type { Metadata } from "next";
import LeadForm from "@/app/components/LeadForm";
import LegalFooter from "@/app/components/LegalFooter";

export const metadata: Metadata = {
  title: "Companies",
  description: "A private Colgrid run for your team: hosted missions, local tastings and a finale meal. From $2,500 for up to 20 players.",
  alternates: { canonical: "/companies" },
};

export default function Companies() {
  return (
    <main className="page home">
      <section className="home-hero">
        <h1>Your team, a whole neighborhood, one afternoon.</h1>
        <p className="home-lede">
          A private Colgrid run for your company: hosted quests, local tastings and a finale meal, built around your group. From $2,500 for
          up to 20 players, +$95 per extra player.
        </p>
      </section>
      <section className="home-section" aria-label="Get a quote">
        <LeadForm kind="corporate" />
      </section>
      <LegalFooter />
    </main>
  );
}
