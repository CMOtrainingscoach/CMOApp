/**
 * Supabase URL + anon key only. Safe to import from Edge middleware (no next/headers).
 * Vercel UI often pastes values with wrapping quotes or stray whitespace.
 */
export function readSupabaseBrowserEnv(): { url: string; key: string } | null {
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const rawKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
  const url = rawUrl.trim().replace(/^["']|["']$/g, "");
  const key = rawKey.trim().replace(/^["']|["']$/g, "");
  if (!url || !key) return null;
  try {
    new URL(url);
  } catch {
    return null;
  }
  return { url, key };
}
