import Link from "next/link";
import { cookies } from "next/headers";
import { getSessionUser, SESSION_COOKIE } from "@/lib/auth/session";

/**
 * Friendly 404. Server component so the "back to my dashboard" link can
 * point at the signed-in user's own home (CEO -> /admin, partner ->
 * /dashboard); signed-out visitors get the sign-in page. Shows no
 * internal details.
 */
export default async function NotFound() {
  let dashboardHref = "/";
  let dashboardLabel = "Back to sign in";
  try {
    const user = await getSessionUser(cookies().get(SESSION_COOKIE)?.value);
    if (user) {
      dashboardHref = user.role === "CEO" ? "/admin" : "/dashboard";
      dashboardLabel = "Back to my dashboard";
    }
  } catch {
    // Session lookup must never break the 404 page itself.
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F4F7FC] px-4">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 text-center shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-widest text-[#004DD9]">404</p>
        <h1 className="mt-2 text-2xl font-bold text-[#011550]">Page not found</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          The page you are looking for does not exist or may have moved.
        </p>
        <Link
          href={dashboardHref}
          className="mt-6 inline-block rounded-full bg-[#004DD9] px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0043c2]"
        >
          {dashboardLabel}
        </Link>
      </div>
    </main>
  );
}
