import { CardEmpty, EmptyState, Panel, StatusBadge } from "@/components/ui";
import Tabs from "@/components/Tabs";
import { requireUser } from "@/lib/auth";
import { formatAmount } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { can, getPermissionMap } from "@/lib/rbac";

export const dynamic = "force-dynamic";

const TABS = [
  { key: "user-tab-pane", label: "Suspicious Users" },
  { key: "accounts", label: "Suspicious User Accounts" },
  { key: "requests", label: "Suspicious Account Requests" },
];

type Search = Record<string, string | string[] | undefined>;

export default async function SuspiciousPage({ searchParams }: { searchParams: Promise<Search> }) {
  const user = await requireUser();
  const params = await searchParams;
  const value = params.tab;
  const activeTab = (Array.isArray(value) ? value[0] : value) || TABS[0].key;

  const permissions = await getPermissionMap(user.id, user.role);

  if (!can(permissions, "SUSPICIOUS_USERS", "read")) {
    return (
      <div className="space-y-4">
        <Tabs tabs={TABS} active={activeTab} basePath="/suspicious" />
        <CardEmpty>You Are Not Authorized. Please Contact Your Upline</CardEmpty>
      </div>
    );
  }

  const clientScope = {
    ...(user.whiteLabelId ? { whiteLabelId: user.whiteLabelId } : {}),
    scope: "SUSPICIOUS" as const,
  };

  return (
    <div className="space-y-4">
      <Tabs tabs={TABS} active={activeTab} basePath="/suspicious" />

      {activeTab === "user-tab-pane" ? <SuspiciousUsers scope={clientScope} /> : null}
      {activeTab === "accounts" ? <SuspiciousAccounts scope={clientScope} /> : null}
      {activeTab === "requests" ? <SuspiciousRequests scope={clientScope} /> : null}
    </div>
  );
}

async function SuspiciousUsers({ scope }: { scope: { whiteLabelId?: string; scope: "SUSPICIOUS" } }) {
  const clients = await prisma.client.findMany({ where: scope, orderBy: { username: "asc" } });

  return (
    <Panel title={`Suspicious Users (${clients.length})`} bodyClassName="p-0">
      {clients.length === 0 ? (
        <EmptyState>NO RECORDS FOUND</EmptyState>
      ) : (
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>S.No</th>
                <th>User Id</th>
                <th>Balance</th>
                <th>Player Balance</th>
                <th>P &amp; L</th>
                <th>Flag</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((client, index) => (
                <tr key={client.id}>
                  <td>{index + 1}.</td>
                  <td>
                    <span className="font-mono text-xs">{client.code}</span>
                    <span className="block text-xs text-zinc-400">{client.username}</span>
                  </td>
                  <td className="font-semibold">{formatAmount(client.balancePaisa)}</td>
                  <td>{formatAmount(client.playerBalancePaisa)}</td>
                  <td>{formatAmount(client.pnlPaisa)}</td>
                  <td>
                    <StatusBadge status="ON_HOLD" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}

async function SuspiciousAccounts({ scope }: { scope: { whiteLabelId?: string; scope: "SUSPICIOUS" } }) {
  const banks = await prisma.bankAccount.findMany({
    where: { client: scope },
    include: { client: { select: { username: true, code: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <Panel title={`Suspicious User Accounts (${banks.length})`} bodyClassName="p-0">
      {banks.length === 0 ? (
        <EmptyState>NO RECORDS FOUND</EmptyState>
      ) : (
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>S.No</th>
                <th>User Id</th>
                <th>Bank</th>
                <th>Account number</th>
                <th>IFSC</th>
                <th>UPI</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {banks.map((bank, index) => (
                <tr key={bank.id}>
                  <td>{index + 1}.</td>
                  <td className="font-mono text-xs">{bank.client?.code}</td>
                  <td>{bank.bankName}</td>
                  <td className="font-mono text-xs">{bank.accountNumber}</td>
                  <td className="font-mono text-xs">{bank.ifsc ?? "—"}</td>
                  <td className="text-xs">{bank.upiId ?? "—"}</td>
                  <td>{bank.isActive ? "Active" : "Disabled"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}

async function SuspiciousRequests({ scope }: { scope: { whiteLabelId?: string; scope: "SUSPICIOUS" } }) {
  const requests = await prisma.request.findMany({
    where: { client: scope },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { client: { select: { username: true, code: true } } },
  });

  return (
    <Panel title={`Suspicious Account Requests (${requests.length})`} bodyClassName="p-0">
      {requests.length === 0 ? (
        <EmptyState>NO RECORDS FOUND</EmptyState>
      ) : (
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>S.No</th>
                <th>User Id</th>
                <th>Amount</th>
                <th>Type</th>
                <th>Destination</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((request, index) => (
                <tr key={request.id}>
                  <td>{index + 1}.</td>
                  <td className="font-mono text-xs">{request.client.code}</td>
                  <td className="font-semibold">{formatAmount(request.amountPaisa)}</td>
                  <td className="capitalize">{request.type.toLowerCase()}</td>
                  <td className="text-xs text-zinc-500">{request.destination ?? "—"}</td>
                  <td>
                    <StatusBadge status={request.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}
