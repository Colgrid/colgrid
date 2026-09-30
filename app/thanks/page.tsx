import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Thanks", robots: { index: false, follow: false } };

export default async function Thanks({ searchParams }: { searchParams: Promise<{ kind?: string; error?: string }> }) {
  const { kind, error } = await searchParams;
  const host = kind === "host";
  return (
    <main className="page">
      <p className="mono eyebrow" style={{ color: "var(--chapter-teal)" }}>
        {host ? "QUEST HOSTS" : "PRIVATE RUNS"}
      </p>
      {error ? (
        <>
          <h1 style={{ fontSize: 36, marginTop: 8 }}>That didn&apos;t go through.</h1>
          <p className="lede">
            {error === "invalid" ? "We need your name and a valid email. " : "Lots of sign-ups at once. Give it a few minutes. "}
            Or just email <a href="mailto:colgridco@gmail.com">colgridco@gmail.com</a>.
          </p>
          <Link href={`/#${host ? "host" : "corporate"}`} className="button button--primary" style={{ marginTop: 24 }}>
            Try again
          </Link>
        </>
      ) : (
      <>
      <h1 style={{ fontSize: 36, marginTop: 8 }}>Got it.</h1>
      <p className="lede">
        {host
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
