import { notFound } from "next/navigation";
import Link from "next/link";
import { EmptyState, Panel, StatusBadge } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { formatAmount, formatSigned } from "@/lib/money";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;

  const client = await prisma.client.findFirst({
    where: { id, ...(user.whiteLabelId ? { whiteLabelId: user.whiteLabelId } : {}) },
    include: {
      ledger: { orderBy: { createdAt: "desc" }, take: 50, include: { actor: true } },
      requests: { orderBy: { createdAt: "desc" }, take: 50 },
      banks: true,
      settings: true,
    },
  });

  if (!client) notFound();

  const summary = [
    { label: "Balance", value: formatAmount(client.balancePaisa) },
    { label: "Player Balance", value: formatAmount(client.playerBalancePaisa) },
    { label: "Credit Reference", value: formatAmount(client.creditReferencePaisa) },
    { label: "Exposure", value: formatAmount(client.exposurePaisa) },
    { label: "P & L", value: formatSigned(client.pnlPaisa) },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/clients" className="text-xs text-green-700 hover:underline">
            ← Back to clients
          </Link>
          <h2 className="text-lg font-bold text-zinc-800">{client.username}</h2>
          <p className="font-mono text-xs text-zinc-400">{client.code}</p>
        </div>
        <StatusBadge status={client.scope} />
      </div>

      <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-5">
        {summary.map((item) => (
          <div key={item.label} className="card p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">{item.label}</p>
            <p className="mt-1 text-lg font-bold text-zinc-800">{item.value}</p>
          </div>
        ))}
      </div>

      <Panel title="Ledger" bodyClassName="p-0">
        {client.ledger.length === 0 ? (
          <EmptyState>NO RECORDS FOUND</EmptyState>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>S.No</th>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Amount</th>
                  <th>Balance after</th>
                  <th>By</th>
                  <th>Note</th>
                </tr>
              </thead>
              <tbody>
                {client.ledger.map((entry, index) => (
                  <tr key={entry.id}>
                    <td>{index + 1}.</td>
                    <td>{entry.createdAt.toLocaleString("en-IN")}</td>
                    <td className="capitalize">{entry.type.toLowerCase()}</td>
                    <td className="font-semibold">{formatAmount(entry.amountPaisa)}</td>
                    <td>{formatAmount(entry.balanceAfterPaisa)}</td>
                    <td className="text-xs text-zinc-500">{entry.actor?.username ?? "system"}</td>
                    <td className="text-xs text-zinc-500">{entry.note ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Requests" bodyClassName="p-0">
          {client.requests.length === 0 ? (
            <EmptyState>NO RECORDS FOUND</EmptyState>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {client.requests.map((request) => (
                  <tr key={request.id}>
                    <td className="text-xs">{request.createdAt.toLocaleDateString("en-IN")}</td>
                    <td className="capitalize">{request.type.toLowerCase()}</td>
                    <td className="font-semibold">{formatAmount(request.amountPaisa)}</td>
                    <td>
                      <StatusBadge status={request.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Panel>

        <div className="space-y-4">
          <Panel title="Bank accounts" bodyClassName="p-0">
            {client.banks.length === 0 ? (
              <EmptyState>NO RECORDS FOUND</EmptyState>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Bank</th>
                    <th>Account</th>
                    <th>Type</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {client.banks.map((bank) => (
                    <tr key={bank.id}>
                      <td>{bank.bankName}</td>
                      <td className="font-mono text-xs">{bank.accountNumber}</td>
                      <td className="capitalize">{bank.type.toLowerCase()}</td>
                      <td>{bank.isActive ? "Active" : "Disabled"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Panel>

          <Panel title="Settings">
            {client.settings ? (
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-xs uppercase tracking-wide text-zinc-500">Payment min</dt>
                  <dd className="font-semibold">{formatAmount(client.settings.paymentLimitMinPaisa)}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-zinc-500">Payment max</dt>
                  <dd className="font-semibold">{formatAmount(client.settings.paymentLimitMaxPaisa)}</dd>
                </div>
              </dl>
            ) : (
              <p className="text-sm text-zinc-400">Not configured</p>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}
