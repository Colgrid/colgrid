import type { Metadata } from "next";
import Link from "next/link";
import LegalPage from "@/app/components/LegalPage";

export const metadata: Metadata = {
  title: "Accessibility",
  description: "How accessible Colgrid gatherings and the Colgrid pass are, and how to ask for help.",
  alternates: { canonical: "/accessibility" },
};

export default function Accessibility() {
  return (
    <LegalPage title="Accessibility" updated="September 30, 2026">
      <p>We want everyone who wants to play to be able to. Here&apos;s what to expect, and how to ask for what you need.</p>

      <h2>At a gathering</h2>
      <ul>
        <li>Gatherings are about 2–4 hours and cover roughly 1–1.5 miles of walking at an easy pace, with stops along the way.</li>
        <li>Routes stay on public sidewalks. Some partner businesses may have steps or narrow spaces; we note this when we know it.</li>
        <li>Missions mix making, tasting, looking and talking, so every team member can take part in different ways.</li>
        <li>Tell us about food allergies or dietary needs when you buy your ticket.</li>
      </ul>
      <p>
        If you use a mobility aid, need a slower pace, or have any other need, <Link href="/contact">contact us</Link> before the gathering.
        We&apos;ll tell you what the route involves and do what we can, such as sending your team on a shorter route.
      </p>

      <h2>On the website and pass</h2>
      <ul>
        <li>We aim for WCAG 2.1 AA: high-contrast colors, large tap targets, text that scales, and pages that work with screen readers.</li>
        <li>Everything on the pass can be done by typing, without scanning a QR code.</li>
      </ul>
      <p>
        Found something hard to use? <Link href="/contact">Tell us</Link> and we&apos;ll fix it.
      </p>
    </LegalPage>
  );
}
