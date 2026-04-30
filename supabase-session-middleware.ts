import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/** Session refresh / auth gate. Kept at repo root so the Edge bundle does not pull `@/lib/supabase/*`. */
export async function updateSupabaseSession(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Create-server-client throws without these — surface a clear deploy-time signal.
  if (!supabaseUrl || !supabaseAnonKey) {
    return new NextResponse(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY — add both under Vercel → Project → Settings → Environment Variables, then redeploy.",
      {
        status: 503,
        headers: {
          "content-type": "text/plain;charset=utf-8",
        },
      },
    );
  }

  try {
    // Throws on malformed URLs; avoids opaque Edge crashes.
    new URL(supabaseUrl);
  } catch {
    return new NextResponse(
      "Invalid NEXT_PUBLIC_SUPABASE_URL — must be an absolute URL (check Vercel env for quotes or stray newlines).",
      {
        status: 503,
        headers: { "content-type": "text/plain;charset=utf-8" },
      },
    );
  }

  let supabaseResponse = NextResponse.next({ request });

  let supabase: ReturnType<typeof createServerClient>;
  try {
    supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(
          cookiesToSet: {
            name: string;
            value: string;
            options?: CookieOptions;
          }[],
          cacheHeaders?: Record<string, string>,
        ) {
          cookiesToSet.forEach(({ name, value, options }) => {
            try {
              request.cookies.set(name, value);
            } catch {
              /* Edge may forbid mutating request.cookies — response cookies still apply */
            }
            try {
              supabaseResponse.cookies.set(name, value, options);
            } catch (e) {
              console.error("[middleware] cookie set failed:", name, e);
            }
          });
          if (cacheHeaders) {
            for (const [key, headerValue] of Object.entries(cacheHeaders)) {
              if (typeof headerValue === "string") {
                try {
                  supabaseResponse.headers.set(key, headerValue);
                } catch {
                  /* ignore */
                }
              }
            }
          }
        },
      },
    });
  } catch (e) {
    console.error("[middleware] createServerClient failed:", e);
    return NextResponse.next({ request });
  }

  let user: null | { id: string } = null;
  try {
    const { data, error } = await supabase.auth.getUser();
    if (!error && data.user) user = data.user;
  } catch (e) {
    console.error("[middleware] supabase.auth.getUser failed — check .env.local and Supabase project:", e);
  }

  const path = request.nextUrl.pathname;
  const isAuthRoute = path.startsWith("/login") || path.startsWith("/signup");
  const isPublic =
    isAuthRoute ||
    path.startsWith("/_next") ||
    path.startsWith("/api/auth") ||
    path === "/favicon.ico";

  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", path);
    return NextResponse.redirect(url);
  }

  if (user && isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
