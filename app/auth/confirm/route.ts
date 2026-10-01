// The link in the sign-in email lands here. It signs the player in, then opens their pass.
// Handles both link styles:
//  - token_hash + type: the Colgrid email template (works even if the email opens in another browser)
//  - code: Supabase's default template
import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { NEXT_COOKIE, safeNext } from "@/lib/safe-next";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const code = searchParams.get("code");

  const supabase = await createClient();
  let signedIn = false;

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    signedIn = !error;
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    signedIn = !error;
  }

  if (!signedIn) {
    return NextResponse.redirect(`${origin}/signin?error=link`);
  }

  // Link this account to its player pass, if one exists for the email (Founding is inactive).
  await supabase.rpc("claim_my_pass");

  // Back to where they were headed (set when they asked for the link), else their pass.
  const cookieStore = await cookies();
  const next = safeNext(cookieStore.get(NEXT_COOKIE)?.value);
  cookieStore.delete(NEXT_COOKIE);
  return NextResponse.redirect(`${origin}${next ?? "/pass"}`);
}
