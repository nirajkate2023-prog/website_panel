"use server";

import type { BankAccountType, VideoKind } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { MODULES } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { toPaise } from "@/lib/money";

export type FormResult = { ok: boolean; message: string };

/* ------------------------------------------------------------------ remarks */

export async function addRemarkAction(formData: FormData): Promise<FormResult> {
  const user = await requireUser();
  const text = String(formData.get("text") ?? "").trim();
  const type = String(formData.get("type") ?? "GENERAL");

  if (!text) return { ok: false, message: "Remark text is required" };

  await prisma.remark.create({ data: { text, type, createdById: user.id } });
  revalidatePath("/configurations");
  return { ok: true, message: "Remark added." };
}

export async function deleteRemarkAction(formData: FormData) {
  await requireUser();
  const id = String(formData.get("id") ?? "");
  await prisma.remark.deleteMany({ where: { id } });
  revalidatePath("/configurations");
}

/* ------------------------------------------------------------------ clients */

export async function addClientAction(formData: FormData): Promise<FormResult> {
  const user = await requireUser();
  const username = String(formData.get("username") ?? "").trim();
  const displayName = String(formData.get("displayName") ?? "").trim() || username;

  if (!username) return { ok: false, message: "Username is required" };
  if (!user.whiteLabelId) return { ok: false, message: "Your account is not linked to a white label" };

  const code = Math.random().toString(16).slice(2, 12);

  await prisma.client.create({
    data: {
      code,
      username,
      displayName,
      whiteLabelId: user.whiteLabelId,
      ownerId: user.id,
      settings: { create: {} },
    },
  });

  revalidatePath("/clients");
  return { ok: true, message: `Client ${username} created.` };
}

/* ------------------------------------------------------------------ banks */

export async function addBankAccountAction(formData: FormData): Promise<FormResult> {
  const user = await requireUser();
  const holderName = String(formData.get("holderName") ?? "").trim();
  const accountNumber = String(formData.get("accountNumber") ?? "").trim();
  const bankName = String(formData.get("bankName") ?? "").trim();
  const ifsc = String(formData.get("ifsc") ?? "").trim();
  const upiId = String(formData.get("upiId") ?? "").trim();
  const type = String(formData.get("type") ?? "CLIENT") as BankAccountType;
  const clientId = String(formData.get("clientId") ?? "");

  if (!holderName || !accountNumber || !bankName) {
    return { ok: false, message: "Holder name, account number and bank are required" };
  }

  await prisma.bankAccount.create({
    data: {
      holderName,
      accountNumber,
      bankName,
      ifsc: ifsc || null,
      upiId: upiId || null,
      type,
      clientId: clientId || null,
      ownerId: user.id,
      activities: { create: { action: "CREATED", actor: user.username } },
    },
  });

  revalidatePath("/bank-account");
  return { ok: true, message: "Bank account added." };
}

export async function toggleBankAccountAction(formData: FormData) {
  await requireUser();
  const id = String(formData.get("id") ?? "");
  const account = await prisma.bankAccount.findUnique({ where: { id } });
  if (!account) return;

  await prisma.bankAccount.update({ where: { id }, data: { isActive: !account.isActive } });
  await prisma.bankActivityLog.create({
    data: { bankAccountId: id, action: account.isActive ? "DISABLED" : "ENABLED" },
  });
  revalidatePath("/bank-account");
}

/* ------------------------------------------------------------------ broadcast */

export async function sendBroadcastAction(formData: FormData): Promise<FormResult> {
  const user = await requireUser();
  const title = String(formData.get("title") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();
  const clientId = String(formData.get("clientId") ?? "");

  if (!title || !message) return { ok: false, message: "Title and message are required" };

  await prisma.broadcast.create({
    data: { title, message, clientId: clientId || null, createdById: user.id },
  });

  revalidatePath("/broadcast");
  return { ok: true, message: "Broadcast queued." };
}

/* ------------------------------------------------------------------ videos */

export async function addVideoAction(formData: FormData): Promise<FormResult> {
  const user = await requireUser();
  const title = String(formData.get("title") ?? "").trim();
  const url = String(formData.get("url") ?? "").trim();
  const kind = String(formData.get("kind") ?? "DEPOSIT") as VideoKind;
  const clientId = String(formData.get("clientId") ?? "");

  if (!title || !url) return { ok: false, message: "Title and video URL are required" };

  await prisma.video.create({ data: { title, url, kind, clientId: clientId || null, createdById: user.id } });

  revalidatePath("/videos");
  return { ok: true, message: "Video saved." };
}

/* ------------------------------------------------------------------ settings */

export async function saveClientSettingsAction(formData: FormData): Promise<FormResult> {
  await requireUser();
  const clientId = String(formData.get("clientId") ?? "");
  if (!clientId) return { ok: false, message: "Select a client first" };

  const min = String(formData.get("min") ?? "0");
  const max = String(formData.get("max") ?? "0");
  const stakes = String(formData.get("stakes") ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean)
    .map(Number)
    .filter((value) => Number.isFinite(value));
  const multiplier = Number(formData.get("multiplier") ?? 1);
  const rules = String(formData.get("rules") ?? "")
    .split("\n")
    .map((value) => value.trim())
    .filter(Boolean);

  const data = {
    paymentLimitMinPaisa: toPaise(min),
    paymentLimitMaxPaisa: toPaise(max),
    stakes,
    walletMultiplier: { value: Number.isFinite(multiplier) ? multiplier : 1 },
    rules,
  };

  await prisma.clientSetting.upsert({
    where: { clientId },
    create: { clientId, ...data },
    update: data,
  });

  revalidatePath("/settings");
  return { ok: true, message: "Settings saved." };
}

/* ------------------------------------------------------------------ permissions */

export async function savePermissionAction(formData: FormData): Promise<FormResult> {
  const user = await requireUser();
  const employeeId = String(formData.get("employeeId") ?? "");
  if (!employeeId) return { ok: false, message: "Pick an employee first" };

  const rows = MODULES.map((module) => ({
    module: module.key,
    canRead: formData.get(`perm:${module.key}:read`) === "on",
    canWrite: formData.get(`perm:${module.key}:write`) === "on",
  }));

  await prisma.$transaction(
    rows.map((row) =>
      prisma.permission.upsert({
        where: { employeeId_module: { employeeId, module: row.module } },
        create: { employeeId, grantedById: user.id, ...row },
        update: { canRead: row.canRead, canWrite: row.canWrite, grantedById: user.id },
      }),
    ),
  );

  await prisma.auditLog.create({
    data: { actorId: user.id, action: "PERMISSION_UPDATED", entity: "User", entityId: employeeId },
  });

  revalidatePath("/permissions");
  return { ok: true, message: "Permissions saved." };
}
