import type { Metadata } from "next";
import Link from "next/link";
import LeadForm from "@/app/components/LeadForm";
import LegalFooter from "@/app/components/LegalFooter";

export const metadata: Metadata = {
  title: "Contact",
  description: "Questions about Colgrid, a ticket, accessibility or press? Send us a message.",
  alternates: { canonical: "/contact" },
};

// A form instead of a public email address: fewer spam bots, and every message lands in one place.
export default function Contact() {
  return (
    <main className="page">
      <p className="mono eyebrow" style={{ color: "var(--chapter-teal)" }}>
        CONTACT
      </p>
      <h1 style={{ fontSize: 36, marginTop: 8 }}>Say hello.</h1>
      <p className="lede">
        Questions about a ticket, accessibility, press, or anything else. We answer within two days. Want to host a quest or book your
        company? Use the <Link href="/#host">host</Link> or <Link href="/#corporate">corporate</Link> forms instead.
      </p>
      <section className="lead-card" style={{ marginTop: 24 }}>
        <LeadForm kind="contact" />
      </section>
      <LegalFooter />
    </main>
  );
}
