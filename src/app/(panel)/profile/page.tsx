import { Panel } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import PasswordForm from "./PasswordForm";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const user = await requireUser();

  return (
    <div className="space-y-4">
      <Panel title="Profile">
        <dl className="mb-6 grid gap-4 text-sm sm:grid-cols-4">
          <div>
            <dt className="text-xs uppercase tracking-wide text-zinc-500">Username</dt>
            <dd className="font-semibold">{user.username}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-zinc-500">Role</dt>
            <dd className="font-semibold capitalize">{user.role.toLowerCase().replace("_", " ")}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-zinc-500">White label</dt>
            <dd className="font-semibold">{user.whiteLabel?.name ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-zinc-500">Upline</dt>
            <dd className="font-semibold">{user.master?.displayName ?? "—"}</dd>
          </div>
        </dl>

        <PasswordForm />
      </Panel>
    </div>
  );
}
