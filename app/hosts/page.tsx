import type { Metadata } from "next";
import LeadForm from "@/app/components/LeadForm";
import LegalFooter from "@/app/components/LegalFooter";

export const metadata: Metadata = {
  title: "Hosts",
  description: "Local makers, kitchens and guides: host a Colgrid quest. Teams come to you, and you're paid for every session.",
  alternates: { canonical: "/hosts" },
};

export default function Hosts() {
  return (
    <main className="page home">
      <section className="home-hero">
        <p className="mono eyebrow" style={{ color: "var(--chapter-teal)" }}>
          FOR LOCAL MAKERS, KITCHENS AND GUIDES
        </p>
        <h1>Host a quest.</h1>
        <p className="home-lede">
          Teams of players come to you with a mission you design: a tasting, a quick make, a story only you can tell. You&apos;re paid for every
          session, and players leave knowing where to find you.
        </p>
      </section>
      <section className="home-section" aria-label="Become a host">
        <LeadForm kind="host" />
      </section>
      <LegalFooter />
    </main>
  );
}
