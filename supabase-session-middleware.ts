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

  let response = NextResponse.next({ request });

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
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
        // Some Edge runtimes reject mutating `request.cookies` — cookies on `response` still reach the browser.
        for (const { name, value } of cookiesToSet) {
          try {
            request.cookies.set(name, value);
          } catch {
            /* ignore — response.cookies carries the authoritative Set-Cookie */
          }
        }
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
        if (cacheHeaders) {
          for (const [key, headerValue] of Object.entries(cacheHeaders)) {
            if (typeof headerValue === "string") {
              response.headers.set(key, headerValue);
            }
          }
        }
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

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

  return response;
}
