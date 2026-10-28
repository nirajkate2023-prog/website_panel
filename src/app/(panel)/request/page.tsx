import { Prisma, type RequestStatus, type RequestType } from "@prisma/client";
import { FileDown, Printer } from "lucide-react";
import Link from "next/link";
import { bulkDecideAction, createRequestAction } from "@/app/actions/requests";
import ActionForm from "@/components/ActionForm";
import AutoRefresh from "@/components/AutoRefresh";
import RequestActions from "@/components/RequestActions";
import Tabs from "@/components/Tabs";
import { EmptyState, Panel, StatusBadge } from "@/components/ui";
import { getSelectedClientId, requireUser } from "@/lib/auth";
import { formatAmount } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { can, getPermissionMap } from "@/lib/rbac";

export const dynamic = "force-dynamic";

const TABS = [
  { key: "wallet-request-tab-pane", label: "Wallet Requests" },
  { key: "statement-import", label: "Statement Import" },
  { key: "checker-panel", label: "Checker Panel" },
];

const DATE_OPTIONS = [
  { value: "today", label: "Today" },
  { value: "7d", label: "Last 7 Days" },
  { value: "30d", label: "Last 30 Days" },
  { value: "all", label: "All Time" },
];

type Search = Record<string, string | string[] | undefined>;

export default async function RequestPage({ searchParams }: { searchParams: Promise<Search> }) {
  const user = await requireUser();
  const params = await searchParams;
  const one = (key: string) => {
    const value = params[key];
    return (Array.isArray(value) ? value[0] : value) ?? "";
  };

  const activeTab = one("tab") || TABS[0].key;
  const permissions = await getPermissionMap(user.id, user.role);
  const filters = {
    master: one("master"),
    type: one("type"),
    status: one("status") || "PENDING",
    suspicious: one("suspicious"),
    date: one("date") || "today",
    utr: one("utr"),
    user: one("user"),
  };

  const clientFilter: Prisma.ClientWhereInput = {};
  if (user.whiteLabelId) clientFilter.whiteLabelId = user.whiteLabelId;
  if (filters.suspicious === "SUSPICIOUS") clientFilter.scope = "SUSPICIOUS";
  if (filters.master) clientFilter.owner = { masterId: filters.master };
  if (filters.user) {
    clientFilter.OR = [
      { username: { contains: filters.user, mode: "insensitive" } },
      { code: { contains: filters.user, mode: "insensitive" } },
    ];
  }

  const createdRange = (() => {
    const now = new Date();
    if (filters.date === "today") {
      const start = new Date(now);
      start.setHours(0, 0, 0, 0);
      return { gte: start };
    }
    if (filters.date === "7d") return { gte: new Date(now.getTime() - 7 * 86_400_000) };
    if (filters.date === "30d") return { gte: new Date(now.getTime() - 30 * 86_400_000) };
    return undefined;
  })();

  const where: Prisma.RequestWhereInput = {
    client: clientFilter,
    ...(filters.status !== "ALL" ? { status: filters.status as RequestStatus } : {}),
    ...(filters.type && filters.type !== "ALL" ? { type: filters.type as RequestType } : {}),
    ...(filters.utr ? { utr: { contains: filters.utr, mode: "insensitive" } } : {}),
    ...(createdRange ? { createdAt: createdRange } : {}),
  };

  const [requests, masters, selectedClientId, clients] = await Promise.all([
    prisma.request.findMany({
      where,
      orderBy: [{ createdAt: "desc" }],
      take: 200,
      include: { client: { select: { code: true, username: true } } },
    }),
    prisma.user.findMany({
      where: { role: "MASTER", ...(user.whiteLabelId ? { whiteLabelId: user.whiteLabelId } : {}) },
      select: { id: true, displayName: true },
      orderBy: { displayName: "asc" },
    }),
    getSelectedClientId(),
    prisma.client.findMany({
      where: user.whiteLabelId ? { whiteLabelId: user.whiteLabelId } : {},
      orderBy: { username: "asc" },
      select: { id: true, username: true, code: true, displayName: true },
    }),
  ]);

  const query = new URLSearchParams(
    Object.entries(filters).filter(([, value]) => Boolean(value)) as [string, string][],
  ).toString();

  const canWrite = can(permissions, "TRANSACTION_WITHDRAWAL", "write");

  return (
    <div className="space-y-4">
      <Tabs
        tabs={TABS}
        active={activeTab}
        basePath="/request"
        right={
          <div className="flex items-center gap-3">
            <AutoRefresh seconds={17} />
          </div>
        }
      />

      {activeTab === "wallet-request-tab-pane" ? (
        <>
          <form method="get" className="card p-4">
            <input type="hidden" name="tab" value="wallet-request-tab-pane" />
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
              <div>
                <label className="label" htmlFor="master">
                  Master
                </label>
                <select id="master" name="master" defaultValue={filters.master} className="field">
                  <option value="">All Master</option>
                  {masters.map((master) => (
                    <option key={master.id} value={master.id}>
                      {master.displayName}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label" htmlFor="type">
                  Request Type
                </label>
                <select id="type" name="type" defaultValue={filters.type} className="field">
                  <option value="">All</option>
                  <option value="DEPOSIT">Deposit</option>
                  <option value="WITHDRAWAL">Withdrawal</option>
                </select>
              </div>
              <div>
                <label className="label" htmlFor="status">
                  Status
                </label>
                <select id="status" name="status" defaultValue={filters.status} className="field">
                  <option value="PENDING">Pending</option>
                  <option value="ON_HOLD">On Hold</option>
                  <option value="APPROVED">Approved</option>
                  <option value="REJECTED">Rejected</option>
                  <option value="ALL">All</option>
                </select>
              </div>
              <div>
                <label className="label" htmlFor="suspicious">
                  Suspicious
                </label>
                <select id="suspicious" name="suspicious" defaultValue={filters.suspicious} className="field">
                  <option value="">All</option>
                  <option value="SUSPICIOUS">Suspicious only</option>
                </select>
              </div>
              <div>
                <label className="label" htmlFor="date">
                  Select by Date
                </label>
                <select id="date" name="date" defaultValue={filters.date} className="field">
                  {DATE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label" htmlFor="utr">
                  UTR Search
                </label>
                <input id="utr" name="utr" defaultValue={filters.utr} className="field" placeholder="UTR number" />
              </div>
              <div>
                <label className="label" htmlFor="user">
                  User Id
                </label>
                <input
                  id="user"
                  name="user"
                  defaultValue={filters.user}
                  className="field"
                  placeholder="username or code"
                />
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <button type="submit" className="btn btn-green">
                Go
              </button>
              <Link href={`/api/requests/export?${query}`} className="btn btn-green">
                XLS
              </Link>
              <Link href={`/request/print?${query}&tab=wallet-request-tab-pane`} className="btn btn-red">
                PDF
              </Link>
              <Link href="/request?tab=wallet-request-tab-pane" className="btn btn-ghost">
                Reset
              </Link>
              <span className="ml-auto text-xs text-zinc-400">{requests.length} row(s)</span>
            </div>
          </form>

          <Panel title="Wallet Requests" bodyClassName="p-0">
            {requests.length === 0 ? (
              <EmptyState>NO RECORDS FOUND</EmptyState>
            ) : (
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>S.No</th>
                      <th>User ID</th>
                      <th>Requested Amount</th>
                      <th>Request Type</th>
                      <th>Status</th>
                      <th>Screenshot</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {requests.map((request, index) => (
                      <tr key={request.id}>
                        <td>{index + 1}.</td>
                        <td>
                          <span className="font-mono text-xs text-zinc-700">{request.client.code}</span>
                          <span className="block text-xs text-zinc-400">{request.client.username}</span>
                        </td>
                        <td className="font-semibold">{formatAmount(request.amountPaisa)}</td>
                        <td className="capitalize">
                          {request.type.toLowerCase()}
                          {request.destination ? (
                            <span className="block text-xs text-zinc-400">{request.destination}</span>
                          ) : null}
                        </td>
                        <td>
                          <StatusBadge status={request.status} />
                        </td>
                        <td>
                          {request.screenshot ? (
                            <a
                              href={request.screenshot}
                              target="_blank"
                              rel="noreferrer"
                              className="text-green-700 underline"
                            >
                              view
                            </a>
                          ) : (
                            <span className="text-zinc-400">—</span>
                          )}
                        </td>
                        <td>
                          {canWrite ? (
                            <RequestActions id={request.id} status={request.status} />
                          ) : (
                            <span className="text-[11px] text-zinc-400">read only</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>

          <Panel title="Raise a request">
            <ActionForm action={createRequestAction} submitLabel="Create request" className="max-w-3xl">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <label className="label" htmlFor="clientId">
                    Client
                  </label>
                  <select id="clientId" name="clientId" defaultValue={selectedClientId ?? ""} className="field" required>
                    <option value="">Select Client</option>
                    {clients.map((client) => (
                      <option key={client.id} value={client.id}>
                        {client.username}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label" htmlFor="reqType">
                    Type
                  </label>
                  <select id="reqType" name="type" className="field">
                    <option value="DEPOSIT">Deposit</option>
                    <option value="WITHDRAWAL">Withdrawal</option>
                  </select>
                </div>
                <div>
                  <label className="label" htmlFor="amount">
                    Amount (INR)
                  </label>
                  <input id="amount" name="amount" type="number" min="1" step="0.01" className="field" required />
                </div>
                <div>
                  <label className="label" htmlFor="destination">
                    Destination / bank
                  </label>
                  <input id="destination" name="destination" className="field" placeholder="bank/Canara Bank" />
                </div>
              </div>
            </ActionForm>
          </Panel>
        </>
      ) : null}

      {activeTab === "checker-panel" ? (
        <Panel title="Checker Panel — pending approvals" bodyClassName="p-0">
          {requests.filter((request) => request.status === "PENDING").length === 0 ? (
            <EmptyState>NO RECORDS FOUND</EmptyState>
          ) : (
            <ActionForm action={bulkDecideAction} submitLabel="Approve selected" className="p-4">
              <input type="hidden" name="status" value="APPROVED" />
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>
                        <input type="checkbox" disabled />
                      </th>
                      <th>S.No</th>
                      <th>User ID</th>
                      <th>Amount</th>
                      <th>Type</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {requests
                      .filter((request) => request.status === "PENDING")
                      .map((request, index) => (
                        <tr key={request.id}>
                          <td>
                            <input type="checkbox" name="ids" value={request.id} />
                          </td>
                          <td>{index + 1}.</td>
                          <td className="font-mono text-xs">{request.client.code}</td>
                          <td className="font-semibold">{formatAmount(request.amountPaisa)}</td>
                          <td className="capitalize">{request.type.toLowerCase()}</td>
                          <td>
                            <StatusBadge status={request.status} />
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </ActionForm>
          )}
        </Panel>
      ) : null}

      {activeTab === "statement-import" ? <StatementImport /> : null}

      <p className="flex items-center gap-2 text-xs text-zinc-400">
        <FileDown className="h-3.5 w-3.5" /> XLS downloads the filtered rows as CSV (opens directly in
        Excel).
        <Printer className="ml-2 h-3.5 w-3.5" /> PDF opens a print-ready statement view.
      </p>
    </div>
  );
}

async function StatementImport() {
  const user = await requireUser();
  const statements = await prisma.statement.findMany({
    where: user.whiteLabelId ? { client: { whiteLabelId: user.whiteLabelId } } : {},
    orderBy: { createdAt: "desc" },
    take: 25,
    include: { client: { select: { username: true, code: true } } },
  });

  return (
    <Panel title="Statement Import" bodyClassName="p-0">
      {statements.length === 0 ? (
        <EmptyState>NO RECORDS FOUND</EmptyState>
      ) : (
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>S.No</th>
                <th>Client</th>
                <th>Period</th>
                <th>Opening</th>
                <th>Closing</th>
                <th>Deposits</th>
                <th>Withdrawals</th>
              </tr>
            </thead>
            <tbody>
              {statements.map((statement, index) => (
                <tr key={statement.id}>
                  <td>{index + 1}.</td>
                  <td className="font-mono text-xs">{statement.client.code}</td>
                  <td>
                    {statement.periodStart.toISOString().slice(0, 10)} →{" "}
                    {statement.periodEnd.toISOString().slice(0, 10)}
                  </td>
                  <td>{formatAmount(statement.openingPaisa)}</td>
                  <td>{formatAmount(statement.closingPaisa)}</td>
                  <td>{formatAmount(statement.depositPaisa)}</td>
                  <td>{formatAmount(statement.withdrawalPaisa)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}
