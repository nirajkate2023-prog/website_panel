"use server";

import { authenticator } from "otplib";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createSession, destroySession, verifyPassword } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export type LoginState = {
  error?: string;
  otpRequired?: boolean;
  userId?: string;
};

const credentials = z.object({
  username: z.string().trim().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = credentials.safeParse({
    username: formData.get("username"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid credentials" };
  }

  const user = await prisma.user.findUnique({
    where: { username: parsed.data.username },
    include: { twoFactor: true },
  });

  // Same message either way so we don't leak which usernames exist.
  if (!user || !user.isActive) return { error: "Invalid username or password" };

  const ok = await verifyPassword(parsed.data.password, user.passwordHash);
  if (!ok) return { error: "Invalid username or password" };

  const token = String(formData.get("token") ?? "").trim();
  const needsOtp = Boolean(user.twoFactor?.enabled && user.twoFactor.secret);

  if (needsOtp) {
    if (!token) {
      return { otpRequired: true, userId: user.id };
    }
    const valid = authenticator.check(token, user.twoFactor!.secret!);
    if (!valid) return { error: "Invalid authentication code", otpRequired: true, userId: user.id };
  }

  await createSession(user.id);
  await prisma.auditLog.create({
    data: { actorId: user.id, action: "LOGIN", entity: "User", entityId: user.id },
  });

  redirect("/dashboard");
}

export async function logoutAction() {
  await destroySession();
  redirect("/login");
}
