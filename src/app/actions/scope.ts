"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { CLIENT_COOKIE, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * Sets the "working as" client for the whole panel. Every client-scoped page reads
 * this so the employee does not have to re-pick the client on each screen.
 */
export async function selectClientAction(formData: FormData) {
  await requireUser();
  const clientId = String(formData.get("clientId") ?? "");

  const store = await cookies();
  if (!clientId) {
    store.delete(CLIENT_COOKIE);
  } else {
    const exists = await prisma.client.findUnique({ where: { id: clientId }, select: { id: true } });
    if (exists) {
      store.set(CLIENT_COOKIE, clientId, {
        sameSite: "lax",
        httpOnly: true,
        path: "/",
        maxAge: 60 * 60 * 12,
      });
    }
  }

  revalidatePath("/", "layout");
}
