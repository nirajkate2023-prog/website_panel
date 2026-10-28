"use server";

import type { RequestStatus, RequestType } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { can, getPermissionMap } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";

const decision = z.object({
  id: z.string().min(1),
  status: z.enum(["APPROVED", "REJECTED", "ON_HOLD", "PENDING"]),
  remark: z.string().trim().max(500).optional(),
});

export type ActionResult = { ok: boolean; message: string };

/**
 * The money-moving endpoint. Approving a request flips the status, moves the
 * client balance and appends a ledger row - all inside one transaction, and only
 * if the request is still PENDING, so a double click can never pay twice.
 */
export async function decideRequestAction(formData: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = decision.safeParse({
    id: formData.get("id"),
    status: formData.get("status"),
    remark: formData.get("remark") || undefined,
  });

  if (!parsed.success) return { ok: false, message: "Invalid request payload" };
  const { id, status, remark } = parsed.data;

  const request = await prisma.request.findUnique({ where: { id } });
  if (!request) return { ok: false, message: "Request not found" };

  const permissions = await getPermissionMap(user.id, user.role);
  const permissionModule = request.type === "DEPOSIT" ? "TRANSACTION_DEPOSIT" : "TRANSACTION_WITHDRAWAL";
  if (!can(permissions, permissionModule, "write")) {
    return { ok: false, message: "You are not authorized for this action. Please contact your upline." };
  }

  const ledgerType = request.type === "DEPOSIT" ? "DEPOSIT" : "WITHDRAWAL";

  try {
    await prisma.$transaction(async (tx) => {
      const claimed = await tx.request.updateMany({
        where: { id, status: "PENDING" },
        data: { status, remark, reviewedById: user.id, reviewedAt: new Date() },
      });

      if (claimed.count === 0) {
        throw new Error("ALREADY_PROCESSED");
      }

      if (status === "APPROVED") {
        const client = await tx.client.findUniqueOrThrow({ where: { id: request.clientId } });
        const delta = request.type === "DEPOSIT" ? request.amountPaisa : -request.amountPaisa;
        const balanceAfter = client.balancePaisa + delta;

        await tx.client.update({
          where: { id: client.id },
          data: { balancePaisa: balanceAfter },
        });

        await tx.ledgerEntry.create({
          data: {
            clientId: client.id,
            type: ledgerType,
            amountPaisa: request.amountPaisa,
            balanceAfterPaisa: balanceAfter,
            referenceId: request.id,
            note: remark,
            actorId: user.id,
          },
        });
      }

      await tx.auditLog.create({
        data: {
          actorId: user.id,
          action: `REQUEST_${status}`,
          entity: "Request",
          entityId: id,
          meta: { amountPaisa: request.amountPaisa.toString(), type: request.type },
        },
      });
    });
  } catch (error) {
    if (error instanceof Error && error.message === "ALREADY_PROCESSED") {
      return { ok: false, message: "This request was already processed by someone else." };
    }
    throw error;
  }

  revalidatePath("/request");
  revalidatePath("/dashboard");
  return { ok: true, message: `Request ${status.toLowerCase()}.` };
}

/** Used by the Checker Panel tab to approve everything a maker queued up. */
export async function bulkDecideAction(formData: FormData): Promise<ActionResult> {
  const ids = formData.getAll("ids").map(String).filter(Boolean);
  if (ids.length === 0) return { ok: false, message: "Nothing selected" };

  let done = 0;
  for (const id of ids) {
    const single = new FormData();
    single.set("id", id);
    single.set("status", String(formData.get("status") ?? "APPROVED"));
    const result = await decideRequestAction(single);
    if (result.ok) done += 1;
  }

  return { ok: done > 0, message: `${done} of ${ids.length} request(s) updated.` };
}

export async function createRequestAction(formData: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const clientId = String(formData.get("clientId") ?? "");
  const type = String(formData.get("type") ?? "DEPOSIT") as RequestType;
  const amount = Number(formData.get("amount") ?? 0);
  const destination = String(formData.get("destination") ?? "").trim();
  const utr = String(formData.get("utr") ?? "").trim();

  if (!clientId || !Number.isFinite(amount) || amount <= 0) {
    return { ok: false, message: "Client and a positive amount are required" };
  }

  const permissions = await getPermissionMap(user.id, user.role);
  const permissionModule = type === "DEPOSIT" ? "TRANSACTION_DEPOSIT" : "TRANSACTION_WITHDRAWAL";
  if (!can(permissions, permissionModule, "write")) {
    return { ok: false, message: "You are not authorized to raise this request." };
  }

  await prisma.request.create({
    data: {
      clientId,
      type,
      amountPaisa: BigInt(Math.round(amount * 100)),
      destination: destination || null,
      utr: utr || null,
      createdById: user.id,
    },
  });

  revalidatePath("/request");
  return { ok: true, message: "Request created." };
}

export type { RequestStatus };
