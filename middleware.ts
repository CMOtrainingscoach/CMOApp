import { type NextRequest, NextResponse } from "next/server";
import { updateSupabaseSession } from "./supabase-session-middleware";

export async function middleware(request: NextRequest) {
  try {
    return await updateSupabaseSession(request);
  } catch (e) {
    console.error("[middleware] uncaught error:", e);
    return NextResponse.next({ request });
  }
}

export const config = {
  matcher: [
    // Never run auth on Next internals (chunks, HMR, manifests) or common /public files.
    // Matching only _next/static|_next/image breaks dev when other /_next/* paths are used.
    "/((?!_next(?:$|/)|[^?]*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|woff2?)$|favicon.ico).*)",
  ],
};
