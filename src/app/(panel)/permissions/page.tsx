import { savePermissionAction } from "@/app/actions/admin";
import ActionForm from "@/components/ActionForm";
import AutoSubmitSelect from "@/components/AutoSubmitSelect";
import { CardEmpty, EmptyState, Panel } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { MODULES } from "@/lib/rbac";

export const dynamic = "force-dynamic";

type Search = Record<string, string | string[] | undefined>;

export default async function PermissionsPage({ searchParams }: { searchParams: Promise<Search> }) {
  const user = await requireUser();
  const params = await searchParams;
  const one = (key: string) => {
    const value = params[key];
    return (Array.isArray(value) ? value[0] : value) ?? "";
  };

  const whiteLabels = await prisma.whiteLabel.findMany({ orderBy: { name: "asc" } });
  const selectedWhiteLabel = one("wl") || user.whiteLabelId || whiteLabels[0]?.id || "";

  const masters = await prisma.user.findMany({
    where: { role: "MASTER", ...(selectedWhiteLabel ? { whiteLabelId: selectedWhiteLabel } : {}) },
    orderBy: { displayName: "asc" },
    select: { id: true, displayName: true },
  });

  const selectedMaster = one("master") || masters[0]?.id || "";

  // The left panel: every employee reporting to the chosen master.
  const employees = selectedMaster
    ? await prisma.user.findMany({
        where: { role: "EMPLOYEE", masterId: selectedMaster },
        orderBy: { displayName: "asc" },
        select: { id: true, username: true, displayName: true },
      })
    : [];

  const selectedEmployee = one("employee") || employees[0]?.id || "";

  const permissions = selectedEmployee
    ? await prisma.permission.findMany({ where: { employeeId: selectedEmployee } })
    : [];

  const map = new Map(permissions.map((row) => [row.module, row]));

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
      <Panel
        title="White Label"
        action={
          <AutoSubmitSelect
            name="wl"
            action="/permissions"
            defaultValue={selectedWhiteLabel}
            options={whiteLabels.map((wl) => ({ value: wl.id, label: wl.name }))}
          />
        }
        bodyClassName="p-0"
      >
        {employees.length === 0 ? (
          <EmptyState>No Permission Found</EmptyState>
        ) : (
          <ul className="divide-y divide-zinc-100">
            {employees.map((employee) => {
              const active = employee.id === selectedEmployee;
              return (
                <li key={employee.id}>
                  <a
                    href={`/permissions?wl=${selectedWhiteLabel}&master=${selectedMaster}&employee=${employee.id}`}
                    className={`flex items-center justify-between px-4 py-3 text-sm ${
                      active ? "bg-green-50 font-semibold text-green-700" : "text-zinc-700 hover:bg-zinc-50"
                    }`}
                  >
                    <span>{employee.displayName}</span>
                    <span className="text-xs text-zinc-400">{employee.username}</span>
                  </a>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>

      <Panel
        title="Master"
        action={
          <AutoSubmitSelect
            name="master"
            action="/permissions"
            defaultValue={selectedMaster}
            hidden={{ wl: selectedWhiteLabel }}
            options={
              masters.length
                ? masters.map((master) => ({ value: master.id, label: master.displayName }))
                : [{ value: "", label: "No masters" }]
            }
          />
        }
      >
        {!selectedEmployee ? (
          <CardEmpty>No Permission Found</CardEmpty>
        ) : (
          <ActionForm action={savePermissionAction} submitLabel="Save permissions">
            <input type="hidden" name="employeeId" value={selectedEmployee} />
            <div className="space-y-3">
              {MODULES.map((module) => {
                const row = map.get(module.key);
                return (
                  <div
                    key={module.key}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-zinc-200 px-3 py-2"
                  >
                    <span className="text-sm font-semibold text-zinc-700">{module.label}</span>
                    <span className="flex items-center gap-4 text-sm">
                      <label className="flex items-center gap-2 text-zinc-600">
                        <input
                          type="checkbox"
                          name={`perm:${module.key}:read`}
                          defaultChecked={row?.canRead ?? false}
                        />
                        Read
                      </label>
                      <label className="flex items-center gap-2 text-zinc-600">
                        <input
                          type="checkbox"
                          name={`perm:${module.key}:write`}
                          defaultChecked={row?.canWrite ?? false}
                        />
                        Write
                      </label>
                      <span
                        className={`w-16 text-right text-xs font-semibold ${
                          row?.canRead ? "text-green-600" : "text-zinc-400"
                        }`}
                      >
                        {row?.canRead ? "Allowed" : "Denied"}
                      </span>
                    </span>
                  </div>
                );
              })}
            </div>
          </ActionForm>
        )}
      </Panel>
    </div>
  );
}
