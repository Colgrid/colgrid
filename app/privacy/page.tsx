import type { Metadata } from "next";
import Link from "next/link";
import LegalPage from "@/app/components/LegalPage";

export const metadata: Metadata = { title: "Privacy", description: "What Colgrid collects and how it's used.", alternates: { canonical: "/privacy" } };

export default function Privacy() {
  return (
    <LegalPage title="Privacy" updated="September 30, 2026">
      <p>Short version: we collect what we need to run the game, we don&apos;t sell it, and you can ask us to delete it.</p>

      <h2>What we collect</h2>
      <ul>
        <li>
          <strong>From your ticket:</strong> your name, email, and who you&apos;re coming with. Eventbrite shares these with us when you buy.
        </li>
        <li>
          <strong>From playing:</strong> your team, which gatherings you attended, the quests your team finished, and your XP, levels and
          badges.
        </li>
        <li>
          <strong>Your location, only when you tap &ldquo;I&apos;m here&rdquo;:</strong> your phone&apos;s position is checked once to confirm
          you&apos;re at a stop. We don&apos;t store it and we don&apos;t track you between stops.
        </li>
        <li>
          <strong>From our forms:</strong> what you send us (for example, your name, email, company and message).
        </li>
        <li>
          <strong>Sign-in:</strong> a secure cookie that keeps you signed in to your pass. We don&apos;t use advertising trackers.
        </li>
      </ul>

      <h2>How we use it</h2>
      <ul>
        <li>To run gatherings: sign you in, put you on a team, reveal the start location, and keep your progress.</li>
        <li>To email you about gatherings you have a ticket for (sign-in links, the location drop, a thank-you and survey).</li>
        <li>To answer your messages.</li>
      </ul>
      <p>Your teammates see your first name and level. They never see your email.</p>

      <h2>Who we share it with</h2>
      <p>
        Only the services that run Colgrid for us: Eventbrite (tickets), Supabase (our database and sign-in), Vercel (hosting) and Resend
        (email). We don&apos;t sell your information or share it with advertisers. Quest hosts don&apos;t get your details.
      </p>

      <h2>Your choices</h2>
      <p>
        You can ask to see, correct or delete your information at any time through our <Link href="/contact">contact form</Link>. Deleting it
        also deletes your pass and progress.
      </p>

      <h2>Kids</h2>
      <p>Colgrid is for adults 18 and over. We don&apos;t knowingly collect information from anyone younger.</p>

      <h2>Changes</h2>
      <p>If we change this policy, we&apos;ll update the date at the top.</p>
    </LegalPage>
  );
}
