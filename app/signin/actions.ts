"use server";

import { cookies, headers } from "next/headers";
import { NEXT_COOKIE, safeNext } from "@/lib/safe-next";
import { createClient } from "@/lib/supabase/server";

export type SignInState = {
  status: "idle" | "sent" | "error";
  email: string;
  message?: string;
};

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Emails a one-tap sign-in link. The reply is the same whether or not the email has a ticket,
// so nobody can use this form to find out who's playing.
export async function sendMagicLink(_prev: SignInState, formData: FormData): Promise<SignInState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!EMAIL.test(email)) {
    return { status: "error", email, message: "That email doesn't look right. Check it and try again." };
  }

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  const origin = h.get("origin") ?? `${proto}://${host}`;

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${origin}/auth/confirm` },
  });

  if (error) {
    if (error.status === 429) {
      return { status: "error", email, message: "Too many links in a short time. Wait a minute, then try again." };
    }
    console.error("signInWithOtp failed", error.status, error.message);
    return { status: "error", email, message: "We couldn't send the link just now. Try again in a minute." };
  }

  // Remember where they were headed (e.g. a QR check-in) so the email link brings them back there.
  const next = safeNext(String(formData.get("next") ?? ""));
  if (next) {
    (await cookies()).set(NEXT_COOKIE, next, {
      httpOnly: true,
      sameSite: "lax",
      secure: origin.startsWith("https://"),
      maxAge: 60 * 60,
      path: "/",
    });
  }

  return { status: "sent", email };
}
