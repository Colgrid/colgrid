import Link from "next/link";
import { SITE } from "@/lib/site";

// The footer on every public page. The home page also shows the social links.
export default function LegalFooter({ social = false }: { social?: boolean }) {
  return (
    <footer className="home-footer">
      <p className="home-footer__brand">
        <Link href="/">
          <strong>Colgrid</strong>
        </Link>
        <br />
        {SITE.footerLine}
      </p>
      {social && (
        <ul className="social" aria-label="Colgrid elsewhere">
          {SITE.social.map((s) => (
            <li key={s.name}>
              <a href={s.url} rel="me noopener" target="_blank">
                {s.name}
              </a>
            </li>
          ))}
        </ul>
      )}
      <nav className="home-footer__links" aria-label="About Colgrid">
        <Link href="/companies">Companies</Link>
        <Link href="/partners">Partners</Link>
        <Link href="/faq">FAQ</Link>
        <Link href="/contact">Contact</Link>
        <Link href="/terms">Terms</Link>
        <Link href="/privacy">Privacy</Link>
        <Link href="/accessibility">Accessibility</Link>
      </nav>
    </footer>
  );
}
