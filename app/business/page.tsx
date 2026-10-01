import type { Metadata } from "next";
import LeadForm from "@/app/components/LeadForm";
import LegalFooter from "@/app/components/LegalFooter";

export const metadata: Metadata = {
  title: "For businesses",
  description:
    "Experiential marketing for local businesses: Colgrid turns your shop into a stop in a real-world game, so groups of friends come in and take on a mission there.",
  alternates: { canonical: "/business" },
};

export default function Business() {
  return (
    <main className="page home">
      <section className="home-hero">
        <h1>Get your business into Colgrid.</h1>
        <p className="home-lede">
          Bring more people into your shop. Colgrid makes your place a stop in the game: teams of friends come in, take on a mission built
          around what you do, and leave knowing where to find you.
        </p>
      </section>
      <section className="home-section" aria-label="Get your business into Colgrid">
        <LeadForm kind="host" />
      </section>
      <LegalFooter />
    </main>
  );
}
