import type { User } from "@prisma/client";
import { cache } from "react";
import { getSelectedClientId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { ClientOption } from "@/lib/types";

/** Clients this user is allowed to see. Scoped to their white label. */
export const listClients = cache(async (user: Pick<User, "whiteLabelId">): Promise<ClientOption[]> => {
  return prisma.client.findMany({
    where: user.whiteLabelId ? { whiteLabelId: user.whiteLabelId } : {},
    orderBy: { username: "asc" },
    select: { id: true, code: true, username: true, displayName: true },
  });
});

/** The client the user picked, re-checked against their scope. */
export async function getScopedClient(user: Pick<User, "whiteLabelId">) {
  const id = await getSelectedClientId();
  if (!id) return null;

  return prisma.client.findFirst({
    where: { id, ...(user.whiteLabelId ? { whiteLabelId: user.whiteLabelId } : {}) },
    include: { settings: true },
  });
}
