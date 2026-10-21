import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/guards";
import { toMeDto } from "@/lib/auth/session";
import { handleApiError } from "@/lib/api";

export async function GET() {
  try {
    const user = await requireUser();
    return NextResponse.json({ data: toMeDto(user) });
  } catch (error) {
    return handleApiError(error);
  }
}
