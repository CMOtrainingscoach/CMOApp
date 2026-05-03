"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

/**
 * Catches runtime errors in authenticated app routes (including RSC failures
 * that bubble to this segment). Production builds hide the underlying message
 * in the HTML response; the digest + Vercel logs are the source of truth.
 */
export default function AppSegmentError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app error]", error);
  }, [error]);

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-6 px-6 py-16 text-center">
      <div className="max-w-md space-y-2">
        <h1 className="font-display text-2xl text-text-primary">
          Something went wrong
        </h1>
        <p className="text-sm text-text-secondary leading-relaxed">
          A server error occurred while loading this page. Check the browser
          console and your Vercel deployment logs for details.
        </p>
        {error.digest && (
          <p className="text-xs font-mono text-text-muted">
            Digest: {error.digest}
          </p>
        )}
        <p className="text-xs text-text-muted leading-relaxed">
          Common causes: missing{" "}
          <code className="text-gold-300/90">NEXT_PUBLIC_SUPABASE_URL</code>,{" "}
          <code className="text-gold-300/90">NEXT_PUBLIC_SUPABASE_ANON_KEY</code>
          , or <code className="text-gold-300/90">SUPABASE_SERVICE_ROLE_KEY</code>{" "}
          on this Vercel environment; or database migrations (including{" "}
          <code className="text-gold-300/90">0007_module_reading_books</code>)
          not applied to production Supabase.
        </p>
      </div>
      <Button type="button" onClick={() => reset()}>
        Try again
      </Button>
    </div>
  );
}
