import Link from "next/link";
import { SITE } from "@/lib/site";

// Footer for the contact and legal pages.
export default function LegalFooter() {
  return (
    <footer className="home-footer">
      <p className="home-footer__brand">
        <Link href="/">
          <strong>Colgrid</strong>
        </Link>
        <br />
        {SITE.location}
      </p>
      <nav className="home-footer__links" aria-label="About Colgrid">
        <Link href="/contact">Contact</Link>
        <Link href="/terms">Terms</Link>
        <Link href="/privacy">Privacy</Link>
        <Link href="/accessibility">Accessibility</Link>
      </nav>
    </footer>
  );
}
