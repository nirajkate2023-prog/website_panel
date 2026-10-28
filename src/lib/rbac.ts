import type { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/** The permission modules rendered by the Permissions page, in order. */
export const MODULES = [
  { key: "TRANSACTION_DEPOSIT", label: "Transaction Requests - Deposit" },
  { key: "TRANSACTION_WITHDRAWAL", label: "Transaction Requests - Withdrawal" },
  { key: "ACCOUNT_STATEMENTS", label: "Account Statements" },
  { key: "CLIENT_ACCOUNTS", label: "Client Accounts" },
  { key: "AGENT_ACCOUNTS", label: "Agent Accounts" },
  { key: "NOTIFICATION", label: "Transaction - Withdrawal Slip" },
  { key: "SUSPICIOUS_USERS", label: "Suspicious Users" },
] as const;

export type ModuleKey = (typeof MODULES)[number]["key"];

export const FULL_ACCESS_ROLES: Role[] = ["SUPER_ADMIN", "ADMIN", "WHITE_LABEL", "MASTER"];

export type PermissionMap = Record<string, { canRead: boolean; canWrite: boolean }>;

export async function getPermissionMap(userId: string, role: Role): Promise<PermissionMap> {
  if (FULL_ACCESS_ROLES.includes(role)) {
    return Object.fromEntries(MODULES.map((m) => [m.key, { canRead: true, canWrite: true }]));
  }

  const rows = await prisma.permission.findMany({ where: { employeeId: userId } });
  return Object.fromEntries(
    rows.map((row) => [row.module, { canRead: row.canRead, canWrite: row.canWrite }]),
  );
}

export function can(map: PermissionMap, module: ModuleKey, action: "read" | "write" = "read") {
  const entry = map[module];
  if (!entry) return false;
  return action === "read" ? entry.canRead : entry.canWrite;
}

export function hasAnyAccess(map: PermissionMap) {
  return Object.values(map).some((entry) => entry.canRead);
}
