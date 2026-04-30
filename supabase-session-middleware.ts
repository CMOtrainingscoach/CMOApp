import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { readSupabaseBrowserEnv } from "./lib/supabase/env-public";

function safeNext(request: NextRequest): NextResponse {
  try {
    return NextResponse.next({ request });
  } catch {
    return NextResponse.next();
  }
}

/** Session refresh / auth gate. Root file + env-public only — do not import `@/lib/supabase/server` (pulls `next/headers` into Edge). */
export async function updateSupabaseSession(request: NextRequest) {
  const env = readSupabaseBrowserEnv();
  if (!env) {
    return new NextResponse(
      "Missing or invalid NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY — set both in Vercel (no quotes), redeploy.",
      {
        status: 503,
        headers: {
          "content-type": "text/plain;charset=utf-8",
        },
      },
    );
  }

  let supabaseResponse = safeNext(request);

  let supabase: ReturnType<typeof createServerClient>;
  try {
    supabase = createServerClient(env.url, env.key, {
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
    return safeNext(request);
  }

  let user: null | { id: string } = null;
  try {
    const { data, error } = await supabase.auth.getUser();
    if (!error && data.user) user = data.user;
  } catch (e) {
    console.error("[middleware] supabase.auth.getUser failed:", e);
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
