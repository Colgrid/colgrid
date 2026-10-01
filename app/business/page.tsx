import type { Metadata } from "next";
import LeadForm from "@/app/components/LeadForm";
import LegalFooter from "@/app/components/LegalFooter";

export const metadata: Metadata = {
  title: "For businesses",
  description: "Have a shop or restaurant in Salt Lake City? Get in touch about being part of Colgrid.",
  alternates: { canonical: "/business" },
};

export default function Business() {
  return (
    <main className="page home">
      <section className="home-hero">
        <h1>Get your business into Colgrid.</h1>
        <p className="home-lede">Have a shop or restaurant? Get in touch.</p>
      </section>
      <section className="home-section" aria-label="Get your business into Colgrid">
        <LeadForm kind="host" />
      </section>
      <LegalFooter />
    </main>
  );
}
