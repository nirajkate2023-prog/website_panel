import { addRemarkAction, deleteRemarkAction } from "@/app/actions/admin";
import ActionForm from "@/components/ActionForm";
import Tabs from "@/components/Tabs";
import { EmptyState, Panel } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const TABS = [{ key: "remarks", label: "Remarks" }];

type Search = Record<string, string | string[] | undefined>;

export default async function ConfigurationsPage({ searchParams }: { searchParams: Promise<Search> }) {
  await requireUser();
  const params = await searchParams;
  const value = params.tab;
  const activeTab = (Array.isArray(value) ? value[0] : value) || TABS[0].key;

  const remarks = await prisma.remark.findMany({
    orderBy: { createdAt: "desc" },
    include: { createdBy: { select: { username: true } } },
  });

  return (
    <div className="space-y-4">
      <Tabs tabs={TABS} active={activeTab} basePath="/configurations" />

      <Panel title="Remarks" bodyClassName="p-0">
        <div className="border-b border-zinc-100 p-4">
          <ActionForm action={addRemarkAction} submitLabel="Add Remark" className="max-w-3xl">
            <div className="grid gap-3 sm:grid-cols-[160px_1fr]">
              <div>
                <label className="label" htmlFor="type">
                  Type
                </label>
                <select id="type" name="type" className="field">
                  <option value="GENERAL">General</option>
                  <option value="BANK">Bank</option>
                  <option value="CLIENT">Client</option>
                </select>
              </div>
              <div>
                <label className="label" htmlFor="text">
                  Remark
                </label>
                <input id="text" name="text" className="field" required />
              </div>
            </div>
          </ActionForm>
        </div>

        {remarks.length === 0 ? (
          <EmptyState>NO RECORDS FOUND</EmptyState>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>S.No</th>
                  <th>Type</th>
                  <th>Remarks</th>
                  <th>By</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {remarks.map((remark, index) => (
                  <tr key={remark.id}>
                    <td>{index + 1}.</td>
                    <td className="capitalize">{remark.type.toLowerCase()}</td>
                    <td>{remark.text}</td>
                    <td className="text-xs text-zinc-500">{remark.createdBy?.username ?? "system"}</td>
                    <td>
                      <form action={deleteRemarkAction}>
                        <input type="hidden" name="id" value={remark.id} />
                        <button type="submit" className="btn btn-red px-3 py-1 text-xs">
                          Delete
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
    </div>
  );
}
