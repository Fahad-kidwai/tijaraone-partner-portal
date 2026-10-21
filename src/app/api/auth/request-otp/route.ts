import { NextResponse } from "next/server";
import { requestOtpSchema } from "@/lib/schemas";
import { requestOtp } from "@/lib/auth/otp";
import { assertSameOrigin, getClientIp } from "@/lib/auth/guards";
import { handleApiError } from "@/lib/api";

export async function POST(req: Request) {
  try {
    assertSameOrigin(req);
    const body = requestOtpSchema.parse(await req.json());
    const result = await requestOtp(body.email, getClientIp(req));
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return handleApiError(error);
  }
}
