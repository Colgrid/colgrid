import type { Metadata } from "next";
import LeadForm from "@/app/components/LeadForm";
import LegalFooter from "@/app/components/LegalFooter";

export const metadata: Metadata = {
  title: "Partners",
  description: "Local shops, restaurants and makers: become a Colgrid partner. Your place becomes a stop on a route, and teams of friends come to you.",
  alternates: { canonical: "/partners" },
};

export default function Partners() {
  return (
    <main className="page home">
      <section className="home-hero">
        <h1>Become a partner.</h1>
        <p className="home-lede">
          Your place becomes a stop on a Colgrid route. Teams of friends come to you, take on a mission built around what you do, and leave
          knowing where to find you.
        </p>
      </section>
      <section className="home-section" aria-label="Become a partner">
        <LeadForm kind="host" />
      </section>
      <LegalFooter />
    </main>
  );
}
