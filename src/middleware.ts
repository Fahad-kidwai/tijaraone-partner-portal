import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { SESSION_COOKIE } from "@/lib/auth/constants";

/**
 * OPTIMISTIC gate only (plan §3.4): verifies the JWT signature at the edge
 * and redirects by role. It does NOT touch the DB — isActive and
 * sessionVersion are enforced authoritatively by requireUser/requireRole
 * in every handler and server component.
 */
type Role = "CEO" | "PARTNER";

async function roleFromToken(token: string | undefined): Promise<Role | null> {
  if (!token || !process.env.SESSION_SECRET) return null;
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(process.env.SESSION_SECRET), {
      algorithms: ["HS256"],
    });
    return payload.role === "CEO" || payload.role === "PARTNER" ? payload.role : null;
  } catch {
    return null;
  }
}

function homeFor(role: Role): string {
  return role === "CEO" ? "/admin" : "/dashboard";
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const role = await roleFromToken(req.cookies.get(SESSION_COOKIE)?.value);

  if (pathname === "/") {
    if (role) return NextResponse.redirect(new URL(homeFor(role), req.url));
    return NextResponse.next();
  }
  if (pathname.startsWith("/admin")) {
    if (!role) return NextResponse.redirect(new URL("/", req.url));
    if (role !== "CEO") return NextResponse.redirect(new URL(homeFor(role), req.url));
    return NextResponse.next();
  }
  if (pathname.startsWith("/dashboard")) {
    if (!role) return NextResponse.redirect(new URL("/", req.url));
    if (role !== "PARTNER") return NextResponse.redirect(new URL(homeFor(role), req.url));
    return NextResponse.next();
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/admin/:path*", "/dashboard/:path*"],
};
