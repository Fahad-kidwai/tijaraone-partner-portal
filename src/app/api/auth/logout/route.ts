import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth/session";
import { assertSameOrigin } from "@/lib/auth/guards";
import { handleApiError } from "@/lib/api";

export async function POST(req: Request) {
  try {
    assertSameOrigin(req);
    const res = NextResponse.json({ ok: true });
    res.cookies.set(SESSION_COOKIE, "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });
    return res;
  } catch (error) {
    return handleApiError(error);
  }
}
