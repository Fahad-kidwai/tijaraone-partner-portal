import { NextResponse } from "next/server";
import { verifyOtpSchema } from "@/lib/schemas";
import { verifyOtp } from "@/lib/auth/otp";
import { signSession, SESSION_COOKIE, SESSION_TTL_SECONDS } from "@/lib/auth/session";
import { assertSameOrigin } from "@/lib/auth/guards";
import { apiError, handleApiError } from "@/lib/api";

export async function POST(req: Request) {
  try {
    assertSameOrigin(req);
    const body = verifyOtpSchema.parse(await req.json());
    const result = await verifyOtp(body.email, body.code);
    if (!result.ok) {
      return apiError(401, "UNAUTHORIZED", "Invalid or expired code. Please check the code or request a new one.");
    }
    const token = await signSession(result.user);
    const res = NextResponse.json({
      data: { user: { id: result.user.id, role: result.user.role, name: result.user.name } },
    });
    res.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_TTL_SECONDS,
    });
    return res;
  } catch (error) {
    return handleApiError(error);
  }
}
