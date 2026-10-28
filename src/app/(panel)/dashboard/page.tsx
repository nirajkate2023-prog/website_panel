import { Banknote, GraduationCap, Ticket, TrendingDown, TrendingUp, Users } from "lucide-react";
import DateRangeForm from "@/components/DateRangeForm";
import { Panel, StatCard } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { formatINR } from "@/lib/money";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function resolveRange(from?: string, to?: string) {
  const start = from ? new Date(`${from}T00:00:00`) : new Date();
  const end = to ? new Date(`${to}T00:00:00`) : new Date();
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  end.setDate(end.getDate() + 1);

  const iso = (date: Date) => date.toISOString().slice(0, 10);
  return {
    start,
    end,
    fromStr: iso(start),
    toStr: iso(new Date(end.getTime() - 86_400_000)),
  };
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const { start, end, fromStr, toStr } = resolveRange(params.from, params.to);

  const clientFilter = user.whiteLabelId ? { whiteLabelId: user.whiteLabelId } : {};
  const requestScope = { client: clientFilter };
  const ledgerScope = { client: clientFilter };

  const [pending, deposits, withdrawals, suspiciousDeposit, suspiciousWithdrawal, clients] =
    await Promise.all([
      prisma.request.aggregate({
        _sum: { amountPaisa: true },
        _count: { _all: true },
        where: { status: "PENDING", ...requestScope },
      }),
      prisma.ledgerEntry.aggregate({
        _sum: { amountPaisa: true },
        where: { type: "DEPOSIT", createdAt: { gte: start, lt: end }, ...ledgerScope },
      }),
      prisma.ledgerEntry.aggregate({
        _sum: { amountPaisa: true },
        where: { type: "WITHDRAWAL", createdAt: { gte: start, lt: end }, ...ledgerScope },
      }),
      prisma.ledgerEntry.aggregate({
        _sum: { amountPaisa: true },
        where: { type: "DEPOSIT", client: { ...clientFilter, scope: "SUSPICIOUS" } },
      }),
      prisma.ledgerEntry.aggregate({
        _sum: { amountPaisa: true },
        where: { type: "WITHDRAWAL", client: { ...clientFilter, scope: "SUSPICIOUS" } },
      }),
      prisma.client.findMany({
        where: clientFilter,
        select: { _count: { select: { ledger: { where: { type: "DEPOSIT" } } } } },
      }),
    ]);

  const totalDeposit = deposits._sum.amountPaisa ?? BigInt(0);
  const totalWithdrawal = withdrawals._sum.amountPaisa ?? BigInt(0);
  const usersWithDeposits = clients.filter((row) => row._count.ledger > 0).length;
  const firstTimeDeposit = clients.filter((row) => row._count.ledger === 1).length;

  return (
    <div className="space-y-4">
      <DateRangeForm from={fromStr} to={toStr} resetHref="/dashboard" />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={Ticket}
          value={formatINR(pending._sum.amountPaisa ?? BigInt(0))}
          label="User Pending Request"
          badge={pending._count._all}
        />
        <StatCard icon={Banknote} value={formatINR(totalDeposit)} label="Total Deposit" dot="green" />
        <StatCard
          icon={Banknote}
          value={formatINR(totalWithdrawal)}
          label="Total Withdrawals"
          dot="red"
        />
        <StatCard
          icon={TrendingUp}
          value={formatINR(totalDeposit - totalWithdrawal)}
          label="Profit / Loss"
          dot="orange"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <StatCard
          icon={Users}
          value={formatINR(pending._sum.amountPaisa ?? BigInt(0))}
          label="Total Inprocess Request"
          tone="orange"
        />
        <StatCard
          icon={GraduationCap}
          value={formatINR(suspiciousDeposit._sum.amountPaisa ?? BigInt(0))}
          label="Suspicious Users Deposit"
          tone="slate"
        />
        <StatCard
          icon={GraduationCap}
          value={formatINR(suspiciousWithdrawal._sum.amountPaisa ?? BigInt(0))}
          label="Suspicious Users Withdrawal"
          tone="slate"
        />
      </div>

      <Panel title="Users" bodyClassName="p-0">
        <div className="grid gap-4 p-4 sm:grid-cols-3">
          <div className="rounded-lg border border-zinc-100 p-3">
            <div className="flex items-start gap-3">
              <span className="mt-1 h-8 w-1 rounded-full bg-violet-500" />
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  First Time Deposit User
                </p>
                <p className="mt-1 text-lg font-bold">{firstTimeDeposit}</p>
              </div>
            </div>
          </div>
          <div className="rounded-lg border border-zinc-100 p-3">
            <div className="flex items-start gap-3">
              <span className="mt-1 h-8 w-1 rounded-full bg-green-500" />
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  First Time Withdrawal User
                </p>
                <p className="mt-1 text-lg font-bold">0</p>
              </div>
            </div>
          </div>
          <div className="rounded-lg border border-zinc-100 p-3">
            <div className="flex items-start gap-3">
              <span className="mt-1 h-8 w-1 rounded-full bg-violet-500" />
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Total Users
                </p>
                <p className="mt-1 text-lg font-bold">{clients.length}</p>
              </div>
            </div>
          </div>
        </div>
        <div className="border-t border-zinc-100 px-4 py-3 text-xs text-zinc-400">
          {usersWithDeposits} client(s) have deposited at least once · range {fromStr} → {toStr}
        </div>
      </Panel>

      <div className="flex items-center gap-2 text-xs text-zinc-400">
        <TrendingDown className="h-3.5 w-3.5" />
        Profit / Loss is deposits minus withdrawals for the selected range.
      </div>
    </div>
  );
}
