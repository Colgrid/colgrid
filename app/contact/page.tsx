import type { Metadata } from "next";
import Link from "next/link";
import LeadForm from "@/app/components/LeadForm";
import LegalFooter from "@/app/components/LegalFooter";

export const metadata: Metadata = {
  title: "Contact",
  description: "Questions about Colgrid, accessibility or press? Send us a message.",
  alternates: { canonical: "/contact" },
};

// A form instead of a public email address: fewer spam bots, and every message lands in one place.
export default function Contact() {
  return (
    <main className="page">
      <h1 style={{ fontSize: 36, marginTop: 8 }}>Say hello.</h1>
      <p className="lede">
        Questions about playing, accessibility, press, or anything else. We answer within two days. Want to become a partner or book your
        company? See the <Link href="/partners">partners</Link> or <Link href="/companies">companies</Link> page instead. You can also DM us on{" "}
        <a href="https://www.instagram.com/colgrid/" rel="noopener" target="_blank">
          Instagram
        </a>
        .
      </p>
      <section className="lead-card" style={{ marginTop: 24 }}>
        <LeadForm kind="contact" />
      </section>
      <LegalFooter />
    </main>
  );
}
