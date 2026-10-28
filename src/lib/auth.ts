import { compare, hash } from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { CLIENT_COOKIE, SESSION_COOKIE, SESSION_MAX_AGE } from "@/lib/constants";
import { prisma } from "@/lib/prisma";

export { CLIENT_COOKIE, SESSION_COOKIE };

const MAX_AGE = SESSION_MAX_AGE;

function secret() {
  const value = process.env.SESSION_SECRET;
  if (!value) throw new Error("SESSION_SECRET is not set");
  return new TextEncoder().encode(value);
}

export function hashPassword(plain: string) {
  return hash(plain, 10);
}

export function verifyPassword(plain: string, hashed: string) {
  return compare(plain, hashed);
}

export async function createSession(userId: string) {
  const token = await new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(secret());

  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function destroySession() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
  store.delete(CLIENT_COOKIE);
}

export async function readSessionUserId(): Promise<string | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return typeof payload.sub === "string" ? payload.sub : null;
  } catch {
    return null;
  }
}

export type SessionUser = NonNullable<Awaited<ReturnType<typeof loadUser>>>;

function loadUser(id: string) {
  return prisma.user.findUnique({
    where: { id },
    include: { whiteLabel: true, master: true },
  });
}

/** Memoised per request so a page can call it as often as it likes. */
export const getCurrentUser = cache(async () => {
  const id = await readSessionUserId();
  if (!id) return null;
  const user = await loadUser(id);
  if (!user || !user.isActive) return null;
  return user;
});

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/** The client the employee is currently working in, from the scope cookie. */
export const getSelectedClientId = cache(async () => {
  const store = await cookies();
  return store.get(CLIENT_COOKIE)?.value ?? null;
});
