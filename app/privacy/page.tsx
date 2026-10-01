import type { Metadata } from "next";
import Link from "next/link";
import LegalPage from "@/app/components/LegalPage";
import { SITE } from "@/lib/site";

export const metadata: Metadata = { title: "Privacy", description: "What Colgrid collects and how it's used.", alternates: { canonical: "/privacy" } };

export default function Privacy() {
  return (
    <LegalPage title="Privacy" updated="October 1, 2026">
      <p>
        This policy explains how {SITE.legalName} (&ldquo;Colgrid,&rdquo; &ldquo;we&rdquo;) handles your information. Short version: we collect
        what we need to run the game, we don&apos;t sell it, and you can ask us to delete it.
      </p>

      <h2>What we collect</h2>
      <ul>
        <li>
          <strong>When you sign up:</strong> your email, your first name and your team&apos;s name.
        </li>
        <li>
          <strong>From playing:</strong> your team, the routes you played, the quests your team finished, and your XP, levels and
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
        <li>To run the game: sign you in, keep your team together, check you&apos;re at a stop, and keep your progress.</li>
        <li>To email you sign-in links and messages about routes you play (for example, a thank-you and a short survey).</li>
        <li>To answer your messages.</li>
      </ul>
      <p>Your teammates see your first name and level. They never see your email.</p>

      <h2>Who we share it with</h2>
      <p>
        Only the services that run Colgrid for us: Supabase (our database and sign-in), Vercel (hosting) and Resend
        (email). We don&apos;t sell your information or share it with advertisers. The businesses at stops don&apos;t get your details.
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
