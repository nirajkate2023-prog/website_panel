import ClientSelect from "@/components/ClientSelect";
import { getSelectedClientId, requireUser } from "@/lib/auth";
import { listClients } from "@/lib/scope";

/** "Select Client" control shared by every client-scoped page. */
export default async function ClientScopeBar({ label = "Select Client" }: { label?: string }) {
  const user = await requireUser();
  const [clients, selectedId] = await Promise.all([listClients(user), getSelectedClientId()]);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{label}</span>
      <ClientSelect clients={clients} selectedId={selectedId} />
    </div>
  );
}
