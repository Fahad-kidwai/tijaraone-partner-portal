/** Edge-safe auth constants (middleware must not import Prisma/session code). */
export const SESSION_COOKIE = "tj_session";
export const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60;
