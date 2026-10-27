import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth/constants";

/**
 * Clears a stale session cookie then sends the browser to `/`.
 * Used when the JWT still verifies (middleware optimistic gate) but the
 * DB session is gone — e.g. after db:reset:dev — to break redirect loops.
 */
export async function GET(req: Request) {
  const res = NextResponse.redirect(new URL("/", req.url));
  res.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return res;
}
