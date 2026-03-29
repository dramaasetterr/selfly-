import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    // Match all dashboard/app routes and auth routes
    "/dashboard/:path*",
    "/prep/:path*",
    "/pricing/:path*",
    "/listing/:path*",
    "/showings/:path*",
    "/offers/:path*",
    "/closing/:path*",
    "/documents/:path*",
    "/marketplace/:path*",
    "/messages/:path*",
    "/profile/:path*",
    "/upgrade/:path*",
    "/login",
    "/signup",
    "/verify-email",
  ],
};
