import LegalFooter from "./LegalFooter";

// Shared layout for Terms, Privacy and Accessibility: plain, readable, dated.
export default function LegalPage({ title, updated, children }: { title: string; updated: string; children: React.ReactNode }) {
  return (
    <main className="page legal">
      <h1 style={{ fontSize: 36, marginTop: 8 }}>{title}</h1>
      <p className="legal__updated mono">Last updated {updated}</p>
      {children}
      <LegalFooter />
    </main>
  );
}
