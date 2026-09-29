import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/safe-next";
import SignInForm from "./SignInForm";

export const metadata: Metadata = { title: "Sign in · Colgrid" };

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ error?: string; next?: string }> }) {
  const { error, next: nextParam } = await searchParams;
  const next = safeNext(nextParam);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect(next ?? "/pass");

  return (
    <main className="page">
      <Link href="/" className="back-link">
        ← Back
      </Link>

      <span className="logo-tile" style={{ marginTop: 40 }}>
        {/* Scaled inside the tile to trim the file's white margin. The logo itself is unchanged. */}
        <Image src="/brand/colgrid-logo.png" alt="Colgrid" width={64} height={64} priority style={{ transform: "scale(1.7)" }} />
      </span>

      <h1 style={{ fontSize: 36, marginTop: 20 }}>Open your pass.</h1>
      <p className="lede">We&apos;ll email you a link. Tap it and you&apos;re in. No password.</p>

      <div style={{ marginTop: 32 }}>
        <SignInForm linkError={error === "link"} next={next} />
      </div>

      <p className="fine-print">
        Use the email you bought your ticket with. New here? <Link href="/">Tickets open soon.</Link>
      </p>
    </main>
  );
}
