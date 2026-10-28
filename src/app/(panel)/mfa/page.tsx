import { revokeDeviceAction } from "@/app/actions/account";
import Tabs from "@/components/Tabs";
import { EmptyState, Panel } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AddEmailCard, EnrolmentCard, MethodToggle, TrustedDevicesToggle } from "./MfaPanels";

export const dynamic = "force-dynamic";

const TABS = [
  { key: "method-disable", label: "2FA Method Disable" },
  { key: "trusted-devices", label: "Trusted Devices" },
  { key: "auth", label: "2FA Authentication" },
  { key: "add-email", label: "Add Email ID" },
  { key: "email-configured", label: "Email Configured" },
];

type Search = Record<string, string | string[] | undefined>;

export default async function MfaPage({ searchParams }: { searchParams: Promise<Search> }) {
  const user = await requireUser();
  const params = await searchParams;
  const value = params.tab;
  const activeTab = (Array.isArray(value) ? value[0] : value) || TABS[2].key;

  // Sequenced deliberately: the node-postgres adapter dislikes two statements
  // interleaving on the same pooled connection.
  const twoFactor = await prisma.twoFactor.upsert({
    where: { userId: user.id },
    create: { userId: user.id },
    update: {},
  });
  const devices = await prisma.trustedDevice.findMany({
    where: { userId: user.id },
    orderBy: { lastUsedAt: "desc" },
  });

  return (
    <div className="space-y-4">
      <Tabs tabs={TABS} active={activeTab} basePath="/mfa" />

      {activeTab === "method-disable" ? (
        <Panel title="2FA Method Disable">
          <p className="mb-4 max-w-2xl text-sm text-zinc-500">
            Turning this off removes the authenticator prompt at sign-in. Only do this if you have
            another second factor in place.
          </p>
          <MethodToggle disabled={twoFactor.methodDisabled} />
        </Panel>
      ) : null}

      {activeTab === "trusted-devices" ? (
        <div className="space-y-4">
          <Panel title="Trusted Devices">
            <TrustedDevicesToggle enabled={twoFactor.trustedDevicesEnabled} />
          </Panel>

          <Panel title={`Known devices (${devices.length})`} bodyClassName="p-0">
            {devices.length === 0 ? (
              <EmptyState>NO RECORDS FOUND</EmptyState>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>S.No</th>
                    <th>Device</th>
                    <th>IP</th>
                    <th>Last used</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {devices.map((device, index) => (
                    <tr key={device.id}>
                      <td>{index + 1}.</td>
                      <td className="font-medium">{device.label}</td>
                      <td className="font-mono text-xs">{device.ip ?? "—"}</td>
                      <td className="text-xs text-zinc-500">
                        {device.lastUsedAt.toLocaleString("en-IN")}
                      </td>
                      <td>
                        <form action={revokeDeviceAction}>
                          <input type="hidden" name="id" value={device.id} />
                          <button type="submit" className="btn btn-red px-3 py-1 text-xs">
                            Revoke
                          </button>
                        </form>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Panel>
        </div>
      ) : null}

      {activeTab === "auth" ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <EnrolmentCard enabled={twoFactor.enabled} secret={twoFactor.secret} />
          <AddEmailCard email={twoFactor.email} verified={twoFactor.emailVerified} />
        </div>
      ) : null}

      {activeTab === "add-email" ? (
        <div className="max-w-2xl">
          <AddEmailCard email={twoFactor.email} verified={twoFactor.emailVerified} />
        </div>
      ) : null}

      {activeTab === "email-configured" ? (
        <Panel title="Email Configured">
          <dl className="grid gap-4 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-xs uppercase tracking-wide text-zinc-500">Email on file</dt>
              <dd className="font-semibold">{twoFactor.email ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-zinc-500">Verified</dt>
              <dd className="font-semibold">{twoFactor.emailVerified ? "Yes" : "No"}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-zinc-500">Authenticator</dt>
              <dd className="font-semibold">{twoFactor.enabled ? "Enabled" : "Not enabled"}</dd>
            </div>
          </dl>
        </Panel>
      ) : null}
    </div>
  );
}
