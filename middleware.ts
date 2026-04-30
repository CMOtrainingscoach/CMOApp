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
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
