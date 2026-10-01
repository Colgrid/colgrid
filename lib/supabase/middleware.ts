// Keeps the player's sign-in fresh on every request and guards signed-in pages.
// Pattern from Supabase's Next.js server-side auth guide.
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Pages that need a signed-in player. Everything else is public.
const SIGNED_IN_ONLY = ["/pass", "/check-in", "/team", "/standings", "/admin", "/gm", "/survey"];

export async function updateSession(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  // Without Supabase settings (e.g. a preview with no env vars) the public pages still work.
  if (!url || !key) return NextResponse.next({ request });

  let response = NextResponse.next({ request });
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  // Don't put code between createServerClient and getUser: it refreshes the session.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  if (!user && SIGNED_IN_ONLY.some((p) => path === p || path.startsWith(`${p}/`))) {
    const signIn = request.nextUrl.clone();
    signIn.pathname = "/signin";
    signIn.search = "";
    // Come back here after signing in (e.g. a host's QR code opened /check-in?code=...).
    signIn.searchParams.set("next", `${path}${request.nextUrl.search}`);
    return NextResponse.redirect(signIn);
  }

  return response;
}
