import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Thanks", robots: { index: false, follow: false } };

export default async function Thanks({ searchParams }: { searchParams: Promise<{ kind?: string; error?: string }> }) {
  const { kind, error } = await searchParams;
  const host = kind === "host";
  const contact = kind === "contact";
  return (
    <main className="page">
      <p className="mono eyebrow" style={{ color: "var(--chapter-teal)" }}>
        {contact ? "CONTACT" : host ? "QUEST HOSTS" : "PRIVATE RUNS"}
      </p>
      {error ? (
        <>
          <h1 style={{ fontSize: 36, marginTop: 8 }}>That didn&apos;t go through.</h1>
          <p className="lede">
            {error === "invalid"
              ? "We need your name and a valid email. "
              : error === "bot"
                ? "We couldn't confirm you're not a bot. Wait for the check above the button to finish, then send it again. "
                : "Lots of sign-ups at once. Give it a few minutes. "}
            Or try the <Link href="/contact">contact form</Link> in a bit.
          </p>
          <Link href={contact ? "/contact" : `/#${host ? "host" : "corporate"}`} className="button button--primary" style={{ marginTop: 24 }}>
            Try again
          </Link>
        </>
      ) : (
      <>
      <h1 style={{ fontSize: 36, marginTop: 8 }}>Got it.</h1>
      <p className="lede">
        {contact
          ? "Thanks for writing. We'll get back to you within two days."
          : host
          ? "We'll be in touch within two days to talk about your mission. Teams are going to love finding you."
          : "We'll be in touch within two days with dates and a quote. Your team doesn't know what's coming."}
      </p>
      </>
      )}
      <Link href="/" className="button button--secondary" style={{ marginTop: 24 }}>
        Back to Colgrid
      </Link>
    </main>
  );
}
