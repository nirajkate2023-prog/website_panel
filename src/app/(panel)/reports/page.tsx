import { getSelectedClientId, requireUser } from "@/lib/auth";
import { formatAmount } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import DateRangeForm from "@/components/DateRangeForm";
import ClientScopeBar from "@/components/ClientScopeBar";
import Tabs from "@/components/Tabs";
import { CardEmpty, EmptyState, Panel } from "@/components/ui";

export const dynamic = "force-dynamic";

const TABS = [
  { key: "m-refers1", label: "Monitoring Report" },
  { key: "agents-dw", label: "Agents D/W" },
  { key: "bank-total", label: "Bank Account Total Amount" },
];

type Search = Record<string, string | string[] | undefined>;

function resolveRange(from?: string, to?: string) {
  const start = from ? new Date(`${from}T00:00:00`) : new Date();
  const end = to ? new Date(`${to}T00:00:00`) : new Date();
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  end.setDate(end.getDate() + 1);
  const iso = (date: Date) => date.toISOString().slice(0, 10);
  return { start, end, fromStr: iso(start), toStr: iso(new Date(end.getTime() - 86_400_000)) };
}

export default async function ReportsPage({ searchParams }: { searchParams: Promise<Search> }) {
  const user = await requireUser();
  const params = await searchParams;
  const one = (key: string) => {
    const value = params[key];
    return (Array.isArray(value) ? value[0] : value) ?? "";
  };

  const activeTab = one("tab") || TABS[0].key;
  const { start, end, fromStr, toStr } = resolveRange(one("from"), one("to"));

  const scope = user.whiteLabelId ? { whiteLabelId: user.whiteLabelId } : {};

  return (
    <div className="space-y-4">
      <Tabs tabs={TABS} active={activeTab} basePath="/reports" right={<ClientScopeBar />} />

      {activeTab === "m-refers1" ? (
        <MonitoringReport start={start} end={end} fromStr={fromStr} toStr={toStr} />
      ) : null}

      {activeTab === "agents-dw" ? <AgentsReport start={start} end={end} scope={scope} /> : null}
      {activeTab === "bank-total" ? <BankTotals scope={scope} /> : null}
    </div>
  );
}

async function MonitoringReport({
  start,
  end,
  fromStr,
  toStr,
}: {
  start: Date;
  end: Date;
  fromStr: string;
  toStr: string;
}) {
  const clientId = await getSelectedClientId();
  if (!clientId) return <CardEmpty>Please Select Client To Continue</CardEmpty>;

  const clientFilter = { clientId };

  const [deposits, withdrawals, ledger] = await Promise.all([
    prisma.ledgerEntry.aggregate({
      _sum: { amountPaisa: true },
      where: { ...clientFilter, type: "DEPOSIT", createdAt: { gte: start, lt: end } },
    }),
    prisma.ledgerEntry.aggregate({
      _sum: { amountPaisa: true },
      where: { ...clientFilter, type: "WITHDRAWAL", createdAt: { gte: start, lt: end } },
    }),
    prisma.ledgerEntry.findMany({
      where: { ...clientFilter, createdAt: { gte: start, lt: end } },
      orderBy: { createdAt: "desc" },
      take: 200,
      include: { actor: { select: { username: true } } },
    }),
  ]);

  const depositTotal = deposits._sum.amountPaisa ?? BigInt(0);
  const withdrawalTotal = withdrawals._sum.amountPaisa ?? BigInt(0);

  return (
    <div className="space-y-4">
      <DateRangeForm from={fromStr} to={toStr} resetHref="/reports?tab=m-refers1" />

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "Total Deposit", value: formatAmount(depositTotal) },
          { label: "Total Withdrawal", value: formatAmount(withdrawalTotal) },
          { label: "Net", value: formatAmount(depositTotal - withdrawalTotal) },
        ].map((card) => (
          <div key={card.label} className="card p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">{card.label}</p>
            <p className="mt-1 text-xl font-bold text-zinc-800">{card.value}</p>
          </div>
        ))}
      </div>

      <Panel title="Monitoring Report" bodyClassName="p-0">
        {ledger.length === 0 ? (
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
                  <th>Handled by</th>
                </tr>
              </thead>
              <tbody>
                {ledger.map((entry, index) => (
                  <tr key={entry.id}>
                    <td>{index + 1}.</td>
                    <td>{entry.createdAt.toLocaleString("en-IN")}</td>
                    <td className="capitalize">{entry.type.toLowerCase()}</td>
                    <td className="font-semibold">{formatAmount(entry.amountPaisa)}</td>
                    <td>{formatAmount(entry.balanceAfterPaisa)}</td>
                    <td className="text-xs text-zinc-500">{entry.actor?.username ?? "system"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}

async function AgentsReport({
  start,
  end,
  scope,
}: {
  start: Date;
  end: Date;
  scope: { whiteLabelId?: string };
}) {
  const entries = await prisma.ledgerEntry.findMany({
    where: { createdAt: { gte: start, lt: end }, client: scope },
    select: { type: true, amountPaisa: true, actor: { select: { username: true } } },
  });

  const agents = new Map<string, { deposit: bigint; withdrawal: bigint }>();
  for (const entry of entries) {
    const key = entry.actor?.username ?? "system";
    const row = agents.get(key) ?? { deposit: BigInt(0), withdrawal: BigInt(0) };
    if (entry.type === "DEPOSIT") row.deposit += entry.amountPaisa;
    if (entry.type === "WITHDRAWAL") row.withdrawal += entry.amountPaisa;
    agents.set(key, row);
  }

  const rows = [...agents.entries()];

  return (
    <Panel title="Agents D/W" bodyClassName="p-0">
      {rows.length === 0 ? (
        <EmptyState>NO RECORDS FOUND</EmptyState>
      ) : (
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>S.No</th>
                <th>Agent</th>
                <th>Deposits</th>
                <th>Withdrawals</th>
                <th>Net</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(([agent, totals], index) => (
                <tr key={agent}>
                  <td>{index + 1}.</td>
                  <td className="font-medium">{agent}</td>
                  <td className="text-green-700">{formatAmount(totals.deposit)}</td>
                  <td className="text-red-600">{formatAmount(totals.withdrawal)}</td>
                  <td className="font-semibold">{formatAmount(totals.deposit - totals.withdrawal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}

async function BankTotals({ scope }: { scope: { whiteLabelId?: string } }) {
  const banks = await prisma.bankAccount.findMany({
    where: { ...(scope.whiteLabelId ? { client: { whiteLabelId: scope.whiteLabelId } } : {}) },
    include: { activities: true, client: { select: { username: true } } },
    orderBy: { createdAt: "asc" },
  });

  return (
    <Panel title="Bank Account Total Amount" bodyClassName="p-0">
      {banks.length === 0 ? (
        <EmptyState>NO RECORDS FOUND</EmptyState>
      ) : (
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>S.No</th>
                <th>Bank</th>
                <th>Account</th>
                <th>Type</th>
                <th>Client</th>
                <th>Activity amount</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {banks.map((bank, index) => {
                const activityTotal = bank.activities.reduce(
                  (sum, entry) => sum + entry.amountPaisa,
                  BigInt(0),
                );
                return (
                  <tr key={bank.id}>
                    <td>{index + 1}.</td>
                    <td>{bank.bankName}</td>
                    <td className="font-mono text-xs">{bank.accountNumber}</td>
                    <td className="capitalize">{bank.type.toLowerCase()}</td>
                    <td>{bank.client?.username ?? "—"}</td>
                    <td className="font-semibold">{formatAmount(activityTotal)}</td>
                    <td>{bank.isActive ? "Active" : "Disabled"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}
