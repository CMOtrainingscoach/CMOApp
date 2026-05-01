"use client";

import { createBrowserClient } from "@supabase/ssr";

import { readSupabaseBrowserEnv } from "./env-public";

export function createClient() {
  const env = readSupabaseBrowserEnv();
  if (!env) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY",
    );
  }
  return createBrowserClient(env.url, env.key);
}
