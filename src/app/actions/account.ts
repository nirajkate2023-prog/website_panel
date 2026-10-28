"use server";

import { authenticator } from "otplib";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentUser, hashPassword, requireUser, verifyPassword } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export type FormState = { ok?: boolean; error?: string; message?: string; secret?: string; otpauth?: string };

const passwords = z
  .object({
    current: z.string().min(1, "Current password is required"),
    next: z.string().min(6, "New password must be at least 6 characters"),
    confirm: z.string().min(1, "Please confirm the new password"),
  })
  .refine((data) => data.next === data.confirm, {
    message: "New password and confirmation do not match",
    path: ["confirm"],
  });

export async function changePasswordAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const parsed = passwords.safeParse({
    current: formData.get("current"),
    next: formData.get("next"),
    confirm: formData.get("confirm"),
  });

  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const ok = await verifyPassword(parsed.data.current, user.passwordHash);
  if (!ok) return { error: "Current password is incorrect" };

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await hashPassword(parsed.data.next) },
  });
  await prisma.auditLog.create({
    data: { actorId: user.id, action: "PASSWORD_CHANGED", entity: "User", entityId: user.id },
  });

  return { ok: true, message: "Password updated successfully." };
}

/** Step 1 of enrolling an authenticator app. Returns the secret + otpauth URL for the QR code. */
export async function startMfaEnrolmentAction(): Promise<FormState> {
  const user = await requireUser();
  const secret = authenticator.generateSecret();
  const otpauth = authenticator.keyuri(user.username, "Get-ID Panel", secret);

  await prisma.twoFactor.upsert({
    where: { userId: user.id },
    create: { userId: user.id, secret, enabled: false },
    update: { secret, enabled: false },
  });

  revalidatePath("/mfa");
  return { ok: true, secret, otpauth, message: "Scan the code with your authenticator app." };
}

export async function enableMfaAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const token = String(formData.get("token") ?? "").trim();

  const record = await prisma.twoFactor.findUnique({ where: { userId: user.id } });
  if (!record?.secret) return { error: "Start enrolment first" };
  if (!authenticator.check(token, record.secret)) return { error: "That code is not valid. Try the next one." };

  await prisma.twoFactor.update({ where: { userId: user.id }, data: { enabled: true, methodDisabled: false } });
  await prisma.auditLog.create({
    data: { actorId: user.id, action: "MFA_ENABLED", entity: "User", entityId: user.id },
  });

  revalidatePath("/mfa");
  return { ok: true, message: "Two-factor authentication is now active." };
}

export async function setMfaDisabledAction(formData: FormData) {
  const user = await requireUser();
  const disabled = String(formData.get("disabled") ?? "") === "true";

  await prisma.twoFactor.upsert({
    where: { userId: user.id },
    create: { userId: user.id, methodDisabled: disabled, enabled: !disabled },
    update: { methodDisabled: disabled, enabled: disabled ? false : undefined },
  });

  revalidatePath("/mfa");
}

export async function setTrustedDevicesAction(formData: FormData) {
  const user = await requireUser();
  const enabled = String(formData.get("enabled") ?? "") === "true";
  await prisma.twoFactor.upsert({
    where: { userId: user.id },
    create: { userId: user.id, trustedDevicesEnabled: enabled },
    update: { trustedDevicesEnabled: enabled },
  });
  revalidatePath("/mfa");
}

export async function revokeDeviceAction(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  await prisma.trustedDevice.deleteMany({ where: { id, userId: user.id } });
  revalidatePath("/mfa");
}

/** Sends a 6 digit code to the address on file. In production this is an email/SMS send. */
export async function sendEmailOtpAction(formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const email = String(formData.get("email") ?? "").trim();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { error: "Enter a valid email address" };

  const code = String(Math.floor(100000 + Math.random() * 900000));
  await prisma.twoFactor.upsert({
    where: { userId: user.id },
    create: { userId: user.id, email, emailCode: code, emailCodeExpiresAt: new Date(Date.now() + 10 * 60_000) },
    update: { email, emailCode: code, emailCodeExpiresAt: new Date(Date.now() + 10 * 60_000), emailVerified: false },
  });

  revalidatePath("/mfa");
  // Dev convenience: the code is returned so you can test without an SMTP server.
  return { ok: true, message: `Verification code sent to ${email}.`, secret: code };
}

export async function verifyEmailOtpAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const code = String(formData.get("code") ?? "").trim();

  const record = await prisma.twoFactor.findUnique({ where: { userId: user.id } });
  if (!record?.emailCode || !record.emailCodeExpiresAt) return { error: "Request a code first" };
  if (record.emailCodeExpiresAt < new Date()) return { error: "That code expired. Send a new one." };
  if (record.emailCode !== code) return { error: "Incorrect code" };

  await prisma.twoFactor.update({
    where: { userId: user.id },
    data: { emailVerified: true, emailCode: null, emailCodeExpiresAt: null },
  });

  revalidatePath("/mfa");
  return { ok: true, message: "Email verified." };
}

export async function currentUserSummary() {
  return getCurrentUser();
}
