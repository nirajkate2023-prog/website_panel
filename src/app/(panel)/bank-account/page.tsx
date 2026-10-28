import { addBankAccountAction, toggleBankAccountAction } from "@/app/actions/admin";
import ActionForm from "@/components/ActionForm";
import ClientScopeBar from "@/components/ClientScopeBar";
import Tabs from "@/components/Tabs";
import { CardEmpty, EmptyState, Panel } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { formatAmount } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { getScopedClient } from "@/lib/scope";

export const dynamic = "force-dynamic";

const TABS = [
  { key: "bank-accounts", label: "Bank Accounts" },
  { key: "agent-bank-accounts", label: "Agent Bank Accounts" },
  { key: "global-account", label: "Global Account" },
  { key: "bank-activity-log", label: "Bank Activity Log" },
];

type Search = Record<string, string | string[] | undefined>;

export default async function BankAccountPage({ searchParams }: { searchParams: Promise<Search> }) {
  const user = await requireUser();
  const params = await searchParams;
  const value = params.tab;
  const activeTab = (Array.isArray(value) ? value[0] : value) || TABS[0].key;

  const client = await getScopedClient(user);
  const whiteLabelFilter = user.whiteLabelId ? { whiteLabelId: user.whiteLabelId } : {};

  const shell = (body: React.ReactNode) => (
    <div className="space-y-4">
      <Tabs tabs={TABS} active={activeTab} basePath="/bank-account" right={<ClientScopeBar />} />
      {body}
    </div>
  );

  if (activeTab === "bank-activity-log") {
    const logs = await prisma.bankActivityLog.findMany({
      where: { bankAccount: { ...(user.whiteLabelId ? { client: whiteLabelFilter } : {}) } },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { bankAccount: { select: { bankName: true, accountNumber: true } } },
    });

    return shell(
      <Panel title="Bank Activity Log" bodyClassName="p-0">
        {logs.length === 0 ? (
          <EmptyState>NO RECORDS FOUND</EmptyState>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>S.No</th>
                <th>Date</th>
                <th>Bank</th>
                <th>Action</th>
                <th>Amount</th>
                <th>Actor</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log, index) => (
                <tr key={log.id}>
                  <td>{index + 1}.</td>
                  <td>{log.createdAt.toLocaleString("en-IN")}</td>
                  <td>
                    {log.bankAccount.bankName}
                    <span className="block font-mono text-[11px] text-zinc-400">
                      {log.bankAccount.accountNumber}
                    </span>
                  </td>
                  <td className="capitalize">{log.action.toLowerCase().replace("_", " ")}</td>
                  <td>{formatAmount(log.amountPaisa)}</td>
                  <td className="text-xs text-zinc-500">{log.actor ?? "system"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Panel>,
    );
  }

  if (activeTab !== "global-account" && !client) {
    return shell(<CardEmpty>Please Select Client To Continue</CardEmpty>);
  }

  const typeFilter =
    activeTab === "bank-accounts"
      ? { type: "CLIENT" as const, clientId: client!.id }
      : activeTab === "agent-bank-accounts"
        ? { type: "AGENT" as const }
        : { type: "GLOBAL" as const };

  const banks = await prisma.bankAccount.findMany({
    where: { ...typeFilter, ...(user.whiteLabelId ? { OR: [{ client: whiteLabelFilter }, { owner: whiteLabelFilter }] } : {}) },
    orderBy: { createdAt: "desc" },
    include: { client: { select: { username: true } } },
  });

  return shell(
    <>
      <Panel title={TABS.find((tab) => tab.key === activeTab)?.label} bodyClassName="p-0">
        {banks.length === 0 ? (
          <EmptyState>NO RECORDS FOUND</EmptyState>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>S.No</th>
                  <th>Holder</th>
                  <th>Bank</th>
                  <th>Account number</th>
                  <th>IFSC</th>
                  <th>UPI</th>
                  <th>Client</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {banks.map((bank, index) => (
                  <tr key={bank.id}>
                    <td>{index + 1}.</td>
                    <td className="font-medium">{bank.holderName}</td>
                    <td>{bank.bankName}</td>
                    <td className="font-mono text-xs">{bank.accountNumber}</td>
                    <td className="font-mono text-xs">{bank.ifsc ?? "—"}</td>
                    <td className="text-xs">{bank.upiId ?? "—"}</td>
                    <td>{bank.client?.username ?? "—"}</td>
                    <td>{bank.isActive ? "Active" : "Disabled"}</td>
                    <td>
                      <form action={toggleBankAccountAction}>
                        <input type="hidden" name="id" value={bank.id} />
                        <button type="submit" className="btn btn-ghost px-3 py-1 text-xs">
                          {bank.isActive ? "Disable" : "Enable"}
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <Panel title="Add bank account">
        <ActionForm action={addBankAccountAction} submitLabel="Add account" className="max-w-4xl">
          <input type="hidden" name="type" value={activeTab === "bank-accounts" ? "CLIENT" : activeTab === "agent-bank-accounts" ? "AGENT" : "GLOBAL"} />
          {client ? <input type="hidden" name="clientId" value={client.id} /> : null}
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className="label" htmlFor="holderName">
                Holder name
              </label>
              <input id="holderName" name="holderName" className="field" required />
            </div>
            <div>
              <label className="label" htmlFor="accountNumber">
                Account number
              </label>
              <input id="accountNumber" name="accountNumber" className="field" required />
            </div>
            <div>
              <label className="label" htmlFor="bankName">
                Bank
              </label>
              <input id="bankName" name="bankName" className="field" required />
            </div>
            <div>
              <label className="label" htmlFor="ifsc">
                IFSC
              </label>
              <input id="ifsc" name="ifsc" className="field" />
            </div>
            <div>
              <label className="label" htmlFor="upiId">
                UPI
              </label>
              <input id="upiId" name="upiId" className="field" />
            </div>
          </div>
        </ActionForm>
      </Panel>
    </>,
  );
}
