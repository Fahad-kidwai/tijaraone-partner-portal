import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { User } from "@prisma/client";
import { getSessionUser, SESSION_COOKIE, type AppRole } from "./session";

/** Page-level guard: redirects instead of throwing (API guards throw). */
export async function requirePageRole(role: AppRole): Promise<User> {
  const token = cookies().get(SESSION_COOKIE)?.value;
  const user = await getSessionUser(token);
  if (!user) redirect("/");
  if (user.role !== role) redirect(user.role === "CEO" ? "/admin" : "/dashboard");
  return user;
}
