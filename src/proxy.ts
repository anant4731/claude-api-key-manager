import { NextRequest, NextResponse } from "next/server";

const SESSION_COOKIE = "keymaster_session";

// Public paths that never require an authenticated session.
// Setup/login/auth endpoints, proxy endpoint (uses its own prx- token),
// and Next.js internals.
const PUBLIC_PREFIXES = [
  "/login",
  "/setup",
  "/api/auth/",
  "/api/proxy/",
  "/_next/",
  "/favicon",
];

const PUBLIC_EXACT = new Set(["/api/auth", "/api/proxy"]);

function isPublic(pathname: string): boolean {
  if (PUBLIC_EXACT.has(pathname)) return true;
  return PUBLIC_PREFIXES.some((p) => pathname.startsWith(p));
}

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (isPublic(pathname)) return NextResponse.next();

  const sessionCookie = req.cookies.get(SESSION_COOKIE)?.value;
  if (!sessionCookie) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    if (pathname !== "/") {
      url.searchParams.set("next", pathname);
    } else {
      url.searchParams.delete("next");
    }
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  // Run on everything except static files / next internals.
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
