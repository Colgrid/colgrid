import type { Metadata } from "next";
import Link from "next/link";
import LegalPage from "@/app/components/LegalPage";
import { SITE } from "@/lib/site";

export const metadata: Metadata = { title: "Terms", description: "The terms for playing Colgrid.", alternates: { canonical: "/terms" } };

export default function Terms() {
  return (
    <LegalPage title="Terms" updated="October 1, 2026">
      <p>
        These terms cover playing Colgrid and using getcolgrid.com and your Colgrid pass. Colgrid is run by {SITE.legalName} (&ldquo;Colgrid,&rdquo;
        &ldquo;we&rdquo;), based in Utah. By using the site or playing, you agree to them.
      </p>

      <h2>Routes</h2>
      <ul>
        <li>We may change a route&apos;s stops or hours, or close a route, at any time.</li>
        <li>If we ever charge for something, the price and refund terms are shown before you pay.</li>
      </ul>

      <h2>Who can play</h2>
      <ul>
        <li>Players must be 18 or older. Where alcohol is served, you must be 21+ and show ID to drink.</li>
        <li>You play at your own risk. Routes involve walking outdoors, crossing streets and trying food. Watch where you&apos;re going, follow traffic rules, and tell us about allergies before you play.</li>
        <li>You may be asked to accept a separate waiver before you play.</li>
      </ul>

      <h2>Playing fair</h2>
      <ul>
        <li>Respect the shops on each route, their staff and customers, neighbors and everyone else on the street. Private property is off-limits unless a mission sends you there.</li>
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
        We may share photos and video from Colgrid on our site and social accounts. If you&apos;d rather not appear,{" "}
        <Link href="/contact">contact us</Link> and we&apos;ll take it down.
      </p>

      <h2>Local businesses</h2>
      <p>Shops and restaurants at stops are independent local businesses. They are responsible for their own premises, food and drinks.</p>

      <h2>The legal part</h2>
      <p>
        Colgrid is provided as is. To the extent the law allows, we aren&apos;t liable for indirect losses, and our total liability is limited to
        what you paid us, if anything. These terms are governed by the laws of Utah. We may update them; the date at
        the top shows the latest version.
      </p>

      <p>
        Questions? <Link href="/contact">Contact us</Link>.
      </p>
    </LegalPage>
  );
}
