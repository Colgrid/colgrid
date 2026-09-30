import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { requireAdmin } from "@/lib/admin/guard";

export const metadata: Metadata = { title: "Admin", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return (
    <div className="admin">
      <header className="admin-header no-print">
        <Link href="/admin" className="admin-header__brand">
          <span className="logo-tile logo-tile--sm">
            <Image src="/brand/colgrid-logo.png" alt="Colgrid" width={36} height={36} style={{ transform: "scale(1.7)" }} />
          </span>
          <span>
            <strong>Admin</strong>
            <span className="mono admin-header__sub">CHAPTER 01: SALT LAKE</span>
          </span>
        </Link>
        <nav className="admin-nav" aria-label="Admin">
          <Link href="/admin">Sessions</Link>
          <Link href="/admin/hosts">Hosts</Link>
          <Link href="/admin/import">Import</Link>
          <Link href="/admin/players">Players</Link>
          <Link href="/admin/leads">Leads</Link>
          <Link href="/pass">My pass</Link>
        </nav>
      </header>
      <main className="admin-main">{children}</main>
    </div>
  );
}
