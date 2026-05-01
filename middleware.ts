import { type NextRequest, NextResponse } from "next/server";

/**
 * Edge-safe gate only — no @supabase/ssr here.
 * Including createServerClient in middleware pulls transitive code that references `__dirname`,
 * which throws on Vercel Edge (`ReferenceError: __dirname is not defined`), especially when
 * the project framework preset is not "Next.js".
 *
 * JWT refresh: see `SupabaseSessionRefresher` in root layout + server `getUser()` on routes.
 */
function hasSbSessionCookie(request: NextRequest): boolean {
  return request.cookies.getAll().some(({ name }) => {
    const n = name.toLowerCase();
    return n.includes("sb-") && n.includes("auth-token");
  });
}

export async function middleware(request: NextRequest) {
  try {
    const path = request.nextUrl.pathname;

    const isAuthRoute =
      path.startsWith("/login") || path.startsWith("/signup");

    const isPublic =
      isAuthRoute ||
      path.startsWith("/_next") ||
      path.startsWith("/api/auth") ||
      path === "/favicon.ico";

    const hasSession = hasSbSessionCookie(request);

    if (!hasSession && !isPublic) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("redirect", path);
      return NextResponse.redirect(url);
    }

    if (hasSession && isAuthRoute) {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      url.search = "";
      return NextResponse.redirect(url);
    }

    return NextResponse.next();
  } catch (e) {
    console.error("[middleware] uncaught error:", e);
    return NextResponse.next();
  }
}

export const config = {
  matcher: [
    "/((?!_next(?:$|/)|[^?]*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|woff2?)$|favicon.ico).*)",
  ],
};
