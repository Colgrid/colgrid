import type { Metadata } from "next";
import LegalFooter from "@/app/components/LegalFooter";
import { FULL_FAQ } from "@/lib/faq";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "FAQ",
  description: "Questions about Colgrid: teams, ages, where you meet, what's included, price and private runs.",
  alternates: { canonical: "/faq" },
};

// Structured data so search engines and AI assistants can read the answers directly.
const faqLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "@id": `${SITE.url}/faq#faq`,
  mainEntity: FULL_FAQ.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
};

export default function FaqPage() {
  return (
    <main className="page home">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd).replace(/</g, "\\u003c") }} />
      <section className="home-hero">
        <h1>Questions</h1>
      </section>
      <section className="home-section" aria-label="Frequently asked questions">
        <div className="faq">
          {FULL_FAQ.map((f) => (
            <details key={f.q}>
              <summary>{f.q}</summary>
              <p>{f.a}</p>
            </details>
          ))}
        </div>
      </section>
      <LegalFooter />
    </main>
  );
}
