import { addVideoAction } from "@/app/actions/admin";
import ActionForm from "@/components/ActionForm";
import ClientScopeBar from "@/components/ClientScopeBar";
import { CardEmpty, EmptyState, Panel } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getScopedClient } from "@/lib/scope";

export const dynamic = "force-dynamic";

export default async function VideosPage() {
  const user = await requireUser();
  const client = await getScopedClient(user);

  if (!client) {
    return (
      <div className="space-y-4">
        <div className="card flex flex-wrap items-center justify-between gap-3 p-4">
          <h2 className="text-sm font-bold text-zinc-800">How to deposit/withdrawal video&apos;s</h2>
          <ClientScopeBar />
        </div>
        <CardEmpty>Please Select Client To Continue</CardEmpty>
      </div>
    );
  }

  const videos = await prisma.video.findMany({
    where: { OR: [{ clientId: client.id }, { clientId: null }] },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-4">
      <div className="card flex flex-wrap items-center justify-between gap-3 p-4">
        <h2 className="text-sm font-bold text-zinc-800">How to deposit/withdrawal video&apos;s</h2>
        <ClientScopeBar />
      </div>

      <Panel title={`Videos for ${client.username}`} bodyClassName="p-0">
        {videos.length === 0 ? (
          <EmptyState>NO RECORDS FOUND</EmptyState>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>S.No</th>
                  <th>Title</th>
                  <th>Type</th>
                  <th>Link</th>
                  <th>Added</th>
                </tr>
              </thead>
              <tbody>
                {videos.map((video, index) => (
                  <tr key={video.id}>
                    <td>{index + 1}.</td>
                    <td className="font-medium">{video.title}</td>
                    <td className="capitalize">{video.kind.toLowerCase()}</td>
                    <td>
                      <a
                        href={video.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-green-700 underline"
                      >
                        open
                      </a>
                    </td>
                    <td className="text-xs text-zinc-500">{video.createdAt.toLocaleDateString("en-IN")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <Panel title="Add a walkthrough video">
        <ActionForm action={addVideoAction} submitLabel="Save video" className="max-w-3xl">
          <input type="hidden" name="clientId" value={client.id} />
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="sm:col-span-1">
              <label className="label" htmlFor="title">
                Title
              </label>
              <input id="title" name="title" className="field" required />
            </div>
            <div>
              <label className="label" htmlFor="kind">
                Type
              </label>
              <select id="kind" name="kind" className="field">
                <option value="DEPOSIT">Deposit</option>
                <option value="WITHDRAWAL">Withdrawal</option>
              </select>
            </div>
            <div>
              <label className="label" htmlFor="url">
                Video URL
              </label>
              <input id="url" name="url" type="url" className="field" required placeholder="https://" />
            </div>
          </div>
        </ActionForm>
      </Panel>
    </div>
  );
}
