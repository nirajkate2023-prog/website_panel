import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { toRupees } from "@/lib/money";

function csvCell(value: string | number) {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/**
 * Filtered request export. Served as CSV with the .xls filename the panel uses so
 * Excel opens it straight away - swap in `exceljs` here if you need real xlsx.
 */
export async function GET(request: Request) {
  const user = await requireUser();
  const params = new URL(request.url).searchParams;

  const status = params.get("status") ?? "PENDING";
  const type = params.get("type") ?? "";

  const requests = await prisma.request.findMany({
    where: {
      client: user.whiteLabelId ? { whiteLabelId: user.whiteLabelId } : {},
      ...(status !== "ALL" ? { status: status as "PENDING" | "APPROVED" | "REJECTED" | "ON_HOLD" } : {}),
      ...(type && type !== "ALL" ? { type: type as "DEPOSIT" | "WITHDRAWAL" } : {}),
    },
    orderBy: { createdAt: "desc" },
    include: { client: { select: { code: true, username: true } } },
  });

  const header = ["S.No", "User ID", "Username", "Requested Amount", "Request Type", "Destination", "UTR", "Status", "Created At"];
  const rows = requests.map((entry, index) => [
    index + 1,
    entry.client.code,
    entry.client.username,
    toRupees(entry.amountPaisa).toFixed(2),
    entry.type,
    entry.destination ?? "",
    entry.utr ?? "",
    entry.status,
    entry.createdAt.toISOString(),
  ]);

  const csv = [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n");
  const stamp = new Date().toISOString().slice(0, 10);

  return new NextResponse(`\uFEFF${csv}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="wallet-requests-${stamp}.csv"`,
    },
  });
}
