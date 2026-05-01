"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

/** Client-side validation/refresh wiring; avoids Edge middleware importing @supabase/ssr (see middleware.ts). */
export function SupabaseSessionRefresher() {
  useEffect(() => {
    try {
      const supabase = createClient();
      void supabase.auth.getUser();
    } catch {
      /* env missing client-side — layout/API will surface auth errors */
    }
  }, []);
  return null;
}
