import { requireUser } from "@/lib/auth";
import { formatAmount } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import PrintTrigger from "./PrintTrigger";

export const dynamic = "force-dynamic";

export default async function RequestPrintPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const status = (Array.isArray(params.status) ? params.status[0] : params.status) || "PENDING";

  const requests = await prisma.request.findMany({
    where: {
      client: user.whiteLabelId ? { whiteLabelId: user.whiteLabelId } : {},
      ...(status !== "ALL" ? { status: status as "PENDING" | "APPROVED" | "REJECTED" | "ON_HOLD" } : {}),
    },
    orderBy: { createdAt: "desc" },
    include: { client: { select: { code: true, username: true } } },
  });

  const total = requests.reduce((sum, entry) => sum + entry.amountPaisa, BigInt(0));

  return (
    <div className="mx-auto max-w-4xl bg-white p-8 print:p-0">
      <PrintTrigger />

      <header className="mb-6 flex items-start justify-between border-b border-zinc-200 pb-4">
        <div>
          <h1 className="text-xl font-bold">Wallet Requests</h1>
          <p className="text-xs text-zinc-500">
            {user.whiteLabel?.name ?? "All white labels"} · generated{" "}
            {new Date().toLocaleString("en-IN")}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs uppercase tracking-wide text-zinc-500">Total</p>
          <p className="text-lg font-bold">{formatAmount(total)}</p>
        </div>
      </header>

      <table className="data-table">
        <thead>
          <tr>
            <th>S.No</th>
            <th>User ID</th>
            <th>Amount</th>
            <th>Type</th>
            <th>Destination</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {requests.map((entry, index) => (
            <tr key={entry.id}>
              <td>{index + 1}.</td>
              <td>
                {entry.client.code}
                <span className="block text-xs text-zinc-400">{entry.client.username}</span>
              </td>
              <td>{formatAmount(entry.amountPaisa)}</td>
              <td className="capitalize">{entry.type.toLowerCase()}</td>
              <td>{entry.destination ?? "—"}</td>
              <td className="capitalize">{entry.status.toLowerCase()}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {requests.length === 0 ? <p className="py-16 text-center text-sm text-zinc-400">No rows</p> : null}
    </div>
  );
}
