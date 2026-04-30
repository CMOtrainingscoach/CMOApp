import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { cache } from "react";

import { readSupabaseBrowserEnv } from "./env-public";

export { readSupabaseBrowserEnv } from "./env-public";

export async function createClient() {
  const env = readSupabaseBrowserEnv();
  if (!env) {
    throw new Error(
      "Supabase env missing: set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY for this Vercel environment (Preview and Production), then redeploy.",
    );
  }
  const cookieStore = await cookies();
  return createServerClient(env.url, env.key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(
        cookiesToSet: { name: string; value: string; options?: CookieOptions }[],
      ) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // setAll called from a Server Component; safe to ignore
        }
      },
    },
  });
}

export const getSupabase = cache(createClient);

export async function getCurrentUser() {
  if (!readSupabaseBrowserEnv()) return null;
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    if (error) return null;
    return user;
  } catch {
    return null;
  }
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) {
    const { redirect } = await import("next/navigation");
    redirect("/login");
  }
  return user;
}

export function createServiceRoleClient() {
  const browser = readSupabaseBrowserEnv();
  const sr = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim().replace(/^["']|["']$/g, "");
  if (!browser || !sr) {
    throw new Error(
      "Missing Supabase URL/anon key or SUPABASE_SERVICE_ROLE_KEY (needed for admin features).",
    );
  }
  return createAdminClient(browser.url, sr, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
