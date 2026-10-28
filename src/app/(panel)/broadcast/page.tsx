import { sendBroadcastAction } from "@/app/actions/admin";
import ActionForm from "@/components/ActionForm";
import ClientScopeBar from "@/components/ClientScopeBar";
import { CardEmpty, EmptyState, Panel } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getScopedClient } from "@/lib/scope";

export const dynamic = "force-dynamic";

export default async function BroadcastPage() {
  const user = await requireUser();
  const client = await getScopedClient(user);

  if (!client) {
    return (
      <div className="space-y-4">
        <div className="card flex flex-wrap items-center justify-between gap-3 p-4">
          <h2 className="text-sm font-bold text-zinc-800">Broadcast Configurations Settings</h2>
          <ClientScopeBar />
        </div>
        <CardEmpty>Please Select Client To Continue</CardEmpty>
      </div>
    );
  }

  const broadcasts = await prisma.broadcast.findMany({
    where: { OR: [{ clientId: client.id }, { clientId: null }] },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { createdBy: { select: { username: true } } },
  });

  return (
    <div className="space-y-4">
      <div className="card flex flex-wrap items-center justify-between gap-3 p-4">
        <h2 className="text-sm font-bold text-zinc-800">Broadcast Configurations Settings</h2>
        <ClientScopeBar />
      </div>

      <Panel title={`Send to ${client.username}`}>
        <ActionForm action={sendBroadcastAction} submitLabel="Send broadcast" className="max-w-3xl">
          <input type="hidden" name="clientId" value={client.id} />
          <div className="space-y-3">
            <div>
              <label className="label" htmlFor="title">
                Title
              </label>
              <input id="title" name="title" className="field" required />
            </div>
            <div>
              <label className="label" htmlFor="message">
                Message
              </label>
              <textarea id="message" name="message" rows={3} className="field" required />
            </div>
          </div>
        </ActionForm>
      </Panel>

      <Panel title="Broadcast history" bodyClassName="p-0">
        {broadcasts.length === 0 ? (
          <EmptyState>NO RECORDS FOUND</EmptyState>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>S.No</th>
                  <th>Title</th>
                  <th>Message</th>
                  <th>Audience</th>
                  <th>Sent by</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {broadcasts.map((broadcast, index) => (
                  <tr key={broadcast.id}>
                    <td>{index + 1}.</td>
                    <td className="font-medium">{broadcast.title}</td>
                    <td className="max-w-md text-zinc-600">{broadcast.message}</td>
                    <td>{broadcast.clientId ? "This client" : "All clients"}</td>
                    <td className="text-xs text-zinc-500">{broadcast.createdBy?.username ?? "system"}</td>
                    <td className="text-xs text-zinc-500">
                      {broadcast.createdAt.toLocaleString("en-IN")}
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
