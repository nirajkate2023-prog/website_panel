/**
 * Dependency-free constants. The Edge runtime (proxy/middleware) imports this file,
 * so it must never pull in Prisma, bcrypt or anything Node-only.
 */
export const SESSION_COOKIE = "getid_session";
export const CLIENT_COOKIE = "getid_client";
export const SESSION_MAX_AGE = 60 * 60 * 12; // 12h
