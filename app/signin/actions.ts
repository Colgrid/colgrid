"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
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

export type CodeState = { error: string | null };

// The 6-digit code from the same email. Needed on iPhone: a home-screen app doesn't share Safari's
// sign-in, and email links open in Safari, so the code is how you sign in inside the app.
export async function verifyCode(_prev: CodeState, formData: FormData): Promise<CodeState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const token = String(formData.get("code") ?? "").replace(/\D/g, "");
  if (!EMAIL.test(email) || token.length < 6 || token.length > 10) return { error: "Enter the 6-digit code from the email." };

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ email, token, type: "email" });
  if (error) {
    return { error: error.status === 429 ? "Too many tries. Wait a minute, then try again." : "That code didn't work. Check it, or send a new one." };
  }
  await supabase.rpc("claim_my_pass");

  const cookieStore = await cookies();
  const next = safeNext(String(formData.get("next") ?? "")) ?? safeNext(cookieStore.get(NEXT_COOKIE)?.value);
  cookieStore.delete(NEXT_COOKIE);
  redirect(next ?? "/pass");
}
