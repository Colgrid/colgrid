import { NextResponse, type NextRequest } from "next/server";
import { SITE } from "@/lib/site";
import { updateSession } from "@/lib/supabase/middleware";

// Two domains, one app (decided Sept 30, 2026):
//  - getcolgrid.com: the public site (home, tickets, corporate, hosts, contact, legal)
//  - colgrid.app: the player app (sign-in, pass, check-in, team) and crew tools (admin, game master)
// Player pages opened on getcolgrid.com move to colgrid.app (old email links keep working), and
// colgrid.app's front door is the sign-in screen (signed-in players go on to their pass).
// Only these exact hosts are touched, so previews and local development behave as before.
const MARKETING_HOSTS = ["getcolgrid.com", "www.getcolgrid.com"];
const APP_HOSTS = ["colgrid.app", "www.colgrid.app"];
const APP_PATHS = ["/signin", "/pass", "/check-in", "/team", "/standings", "/admin", "/gm", "/auth", "/survey"];

export async function middleware(request: NextRequest) {
  const host = (request.headers.get("host") ?? "").toLowerCase();
  const { pathname, search } = request.nextUrl;

  if (MARKETING_HOSTS.includes(host) && APP_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return NextResponse.redirect(new URL(`${pathname}${search}`, SITE.appUrl), 308);
  }
  if (APP_HOSTS.includes(host) && pathname === "/") {
    return NextResponse.redirect(new URL("/signin", SITE.appUrl), 307);
  }
  return updateSession(request);
}

export const config = {
  // Skip static files and images.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|brand/|.*\\.(?:png|jpg|jpeg|svg|webp|ico)$).*)"],
};
