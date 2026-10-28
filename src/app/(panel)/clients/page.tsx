import { Prisma } from "@prisma/client";
import { FileText } from "lucide-react";
import Link from "next/link";
import { addClientAction } from "@/app/actions/admin";
import ActionForm from "@/components/ActionForm";
import ClientScopeBar from "@/components/ClientScopeBar";
import { EmptyState, Panel } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { formatAmount, formatSigned } from "@/lib/money";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Search = Record<string, string | string[] | undefined>;

export default async function ClientsPage({ searchParams }: { searchParams: Promise<Search> }) {
  const user = await requireUser();
  const params = await searchParams;
  const one = (key: string) => {
    const value = params[key];
    return (Array.isArray(value) ? value[0] : value) ?? "";
  };

  const query = one("q");
  const digits = one("digits");
  const sort = one("sort") || "default";

  const where: Prisma.ClientWhereInput = {
    ...(user.whiteLabelId ? { whiteLabelId: user.whiteLabelId } : {}),
  };
  if (query) {
    where.OR = [
      { username: { contains: query, mode: "insensitive" } },
      { code: { contains: query, mode: "insensitive" } },
      { displayName: { contains: query, mode: "insensitive" } },
    ];
  }
  if (digits) where.code = { contains: digits, mode: "insensitive" };

  const orderBy: Prisma.ClientOrderByWithRelationInput =
    sort === "balance_desc"
      ? { balancePaisa: "desc" }
      : sort === "balance_asc"
        ? { balancePaisa: "asc" }
        : { username: "asc" };

  const clients = await prisma.client.findMany({ where, orderBy, take: 200 });

  return (
    <div className="space-y-4">
      <form method="get" className="card flex flex-wrap items-end gap-3 p-4">
        <div>
          <label className="label" htmlFor="q">
            UserId
          </label>
          <input id="q" name="q" defaultValue={query} className="field" placeholder="username or code" />
        </div>
        <div>
          <label className="label" htmlFor="sort">
            Sort Balance
          </label>
          <select id="sort" name="sort" defaultValue={sort} className="field">
            <option value="default">Default</option>
            <option value="balance_desc">Balance (High → Low)</option>
            <option value="balance_asc">Balance (Low → High)</option>
          </select>
        </div>
        <div>
          <label className="label" htmlFor="digits">
            Enter 3 digits
          </label>
          <input id="digits" name="digits" defaultValue={digits} className="field w-32" maxLength={6} />
        </div>
        <button type="submit" className="btn btn-green">
          Go
        </button>
        <Link href="/clients" className="btn btn-red">
          Reset
        </Link>
        <div className="ml-auto flex items-center gap-3">
          <ClientScopeBar label="Working as" />
        </div>
      </form>

      <Panel
        title={`Clients (${clients.length})`}
        action={
          <span className="text-xs text-zinc-400">
            {user.whiteLabel?.name ?? "All white labels"}
          </span>
        }
        bodyClassName="p-0"
      >
        {clients.length === 0 ? (
          <EmptyState>NO RECORDS FOUND</EmptyState>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>S.No</th>
                  <th>User Id</th>
                  <th>Credit Reference</th>
                  <th>Balance</th>
                  <th>Player Balance</th>
                  <th>Exposure</th>
                  <th>P &amp; L</th>
                  <th>Accounts Details</th>
                </tr>
              </thead>
              <tbody>
                {clients.map((client, index) => (
                  <tr key={client.id}>
                    <td>{index + 1}</td>
                    <td>
                      <span className="font-mono text-xs text-zinc-700">{client.code}</span>
                      <span className="block text-xs text-zinc-400">{client.username}</span>
                    </td>
                    <td>{formatAmount(client.creditReferencePaisa)}</td>
                    <td>
                      <span className="font-semibold">{formatAmount(client.balancePaisa)}</span>
                      <span className="block text-[11px] text-zinc-400">EB: 0</span>
                    </td>
                    <td>{formatAmount(client.playerBalancePaisa)}</td>
                    <td>{formatAmount(client.exposurePaisa)}</td>
                    <td className={client.pnlPaisa >= BigInt(0) ? "text-green-600" : "text-red-600"}>
                      {formatSigned(client.pnlPaisa)}
                    </td>
                    <td>
                      <Link
                        href={`/clients/${client.id}`}
                        className="inline-flex items-center gap-1 text-green-700 hover:underline"
                      >
                        <FileText className="h-4 w-4" />
                        <span className="text-xs">Details</span>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <Panel title="Add Client">
        <ActionForm action={addClientAction} submitLabel="Add Client" className="max-w-2xl">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="username">
                Username
              </label>
              <input id="username" name="username" className="field" required />
            </div>
            <div>
              <label className="label" htmlFor="displayName">
                Display name
              </label>
              <input id="displayName" name="displayName" className="field" />
            </div>
          </div>
        </ActionForm>
      </Panel>
    </div>
  );
}
