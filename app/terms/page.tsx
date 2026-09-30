import type { Metadata } from "next";
import Link from "next/link";
import LegalPage from "@/app/components/LegalPage";
import { SITE } from "@/lib/site";

export const metadata: Metadata = { title: "Terms", description: "The terms for playing Colgrid.", alternates: { canonical: "/terms" } };

export default function Terms() {
  return (
    <LegalPage title="Terms" updated="September 30, 2026">
      <p>
        These terms cover playing Colgrid and using getcolgrid.com and your Colgrid pass. Colgrid is run by {SITE.legalName} (&ldquo;Colgrid,&rdquo;
        &ldquo;we&rdquo;), based in Utah. By buying a ticket or using the site, you agree to them.
      </p>

      <h2>Tickets</h2>
      <ul>
        <li>Tickets are sold through Eventbrite. Eventbrite&apos;s terms apply to the purchase, and the refund policy is the one shown on the ticket page.</li>
        <li>A ticket is for one player at one gathering. If a gathering is cancelled, you get a full refund.</li>
        <li>We may change a gathering&apos;s start spot, stops or partners. The start location is revealed before the gathering by email and on your pass.</li>
      </ul>

      <h2>Who can play</h2>
      <ul>
        <li>Players must be 18 or older. Where alcohol is served, you must be 21+ and show ID to drink.</li>
        <li>You play at your own risk. Gatherings involve walking outdoors, crossing streets and trying food. Watch where you&apos;re going, follow traffic rules, and tell us about allergies before you play.</li>
        <li>You may be asked to accept a separate waiver when you buy a ticket.</li>
      </ul>

      <h2>Playing fair</h2>
      <ul>
        <li>Respect hosts, their staff and customers, neighbors and everyone else on the street. Private property is off-limits unless a mission sends you there.</li>
        <li>Don&apos;t share quest codes or answers, fake your location, or interfere with other teams.</li>
        <li>We can remove a player who puts others at risk or breaks these rules, without a refund.</li>
      </ul>

      <h2>Your pass, XP and badges</h2>
      <ul>
        <li>XP, levels and badges are part of the game. They have no cash value and can&apos;t be sold or transferred.</li>
        <li>Progress only goes up: we don&apos;t take away XP or badges you&apos;ve earned, except to fix a mistake or cheating.</li>
      </ul>

      <h2>Photos</h2>
      <p>
        We may take photos and video at gatherings and share them on our site and social accounts. If you&apos;d rather not appear, tell the
        crew on the day or <Link href="/contact">contact us</Link> and we&apos;ll take it down.
      </p>

      <h2>Partners</h2>
      <p>Quests are hosted by independent local businesses. They are responsible for their own premises, food and drinks.</p>

      <h2>The legal part</h2>
      <p>
        Colgrid is provided as is. To the extent the law allows, we aren&apos;t liable for indirect losses, and our total liability for any
        gathering is limited to what you paid for that ticket. These terms are governed by the laws of Utah. We may update them; the date at
        the top shows the latest version.
      </p>

      <p>
        Questions? <Link href="/contact">Contact us</Link>.
      </p>
    </LegalPage>
  );
}
