import { saveClientSettingsAction } from "@/app/actions/admin";
import ActionForm from "@/components/ActionForm";
import ClientScopeBar from "@/components/ClientScopeBar";
import Tabs from "@/components/Tabs";
import { CardEmpty, Panel } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { formatAmount, toRupees } from "@/lib/money";
import { getScopedClient } from "@/lib/scope";

export const dynamic = "force-dynamic";

const TABS = [
  { key: "payment-range-pane", label: "Payment Limit" },
  { key: "stakes", label: "Stakes" },
  { key: "wallet-multiplier", label: "Wallet Multiplier" },
  { key: "rules", label: "Rules" },
];

type Search = Record<string, string | string[] | undefined>;

export default async function SettingsPage({ searchParams }: { searchParams: Promise<Search> }) {
  const user = await requireUser();
  const params = await searchParams;
  const value = params.tab;
  const activeTab = (Array.isArray(value) ? value[0] : value) || TABS[0].key;

  const client = await getScopedClient(user);

  if (!client) {
    return (
      <div className="space-y-4">
        <Tabs tabs={TABS} active={activeTab} basePath="/settings" right={<ClientScopeBar />} />
        <CardEmpty>Please Select Client To Continue</CardEmpty>
      </div>
    );
  }

  const settings = client.settings;
  const stakes = Array.isArray(settings?.stakes) ? (settings!.stakes as number[]).join(", ") : "";
  const multiplierRaw = settings?.walletMultiplier as { value?: number } | undefined;
  const multiplier = multiplierRaw?.value ?? 1;
  const rules = Array.isArray(settings?.rules) ? (settings!.rules as string[]).join("\n") : "";
  const minRupees = toRupees(settings?.paymentLimitMinPaisa ?? BigInt(0));
  const maxRupees = toRupees(settings?.paymentLimitMaxPaisa ?? BigInt(0));

  // Every tab writes the whole settings record, so the fields we are not editing are
  // carried through as hidden inputs instead of being silently reset.
  const carry = (
    <>
      {activeTab !== "payment-range-pane" ? (
        <>
          <input type="hidden" name="min" value={minRupees} />
          <input type="hidden" name="max" value={maxRupees} />
        </>
      ) : null}
      {activeTab !== "stakes" ? <input type="hidden" name="stakes" value={stakes} /> : null}
      {activeTab !== "wallet-multiplier" ? (
        <input type="hidden" name="multiplier" value={multiplier} />
      ) : null}
      {activeTab !== "rules" ? <input type="hidden" name="rules" value={rules} /> : null}
    </>
  );

  return (
    <div className="space-y-4">
      <Tabs tabs={TABS} active={activeTab} basePath="/settings" right={<ClientScopeBar />} />

      <Panel title={`${TABS.find((tab) => tab.key === activeTab)?.label} — ${client.username}`}>
        <ActionForm
          action={saveClientSettingsAction}
          submitLabel="Save settings"
          className="max-w-3xl"
        >
          <input type="hidden" name="clientId" value={client.id} />
          {carry}

          {activeTab === "payment-range-pane" ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="label" htmlFor="min">
                  Minimum payment (INR)
                </label>
                <input
                  id="min"
                  name="min"
                  type="number"
                  min="0"
                  step="0.01"
                  defaultValue={minRupees}
                  className="field"
                />
              </div>
              <div>
                <label className="label" htmlFor="max">
                  Maximum payment (INR)
                </label>
                <input
                  id="max"
                  name="max"
                  type="number"
                  min="0"
                  step="0.01"
                  defaultValue={maxRupees}
                  className="field"
                />
              </div>
            </div>
          ) : null}

          {activeTab === "stakes" ? (
            <div>
              <label className="label" htmlFor="stakes">
                Allowed stakes (comma separated)
              </label>
              <input id="stakes" name="stakes" defaultValue={stakes} className="field" placeholder="100, 500, 1000" />
            </div>
          ) : null}

          {activeTab === "wallet-multiplier" ? (
            <div>
              <label className="label" htmlFor="multiplier">
                Wallet multiplier
              </label>
              <input
                id="multiplier"
                name="multiplier"
                type="number"
                step="0.1"
                min="0"
                defaultValue={multiplier}
                className="field"
              />
            </div>
          ) : null}

          {activeTab === "rules" ? (
            <div>
              <label className="label" htmlFor="rules">
                Rules (one per line)
              </label>
              <textarea id="rules" name="rules" rows={6} defaultValue={rules} className="field" />
            </div>
          ) : null}
        </ActionForm>
      </Panel>

      <Panel title="Current configuration">
        <dl className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <dt className="text-xs uppercase tracking-wide text-zinc-500">Payment limit</dt>
            <dd className="font-semibold">
              {formatAmount(settings?.paymentLimitMinPaisa ?? BigInt(0))} —{" "}
              {formatAmount(settings?.paymentLimitMaxPaisa ?? BigInt(0))}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-zinc-500">Stakes</dt>
            <dd className="font-semibold">{stakes || "—"}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-zinc-500">Wallet multiplier</dt>
            <dd className="font-semibold">{multiplier}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-zinc-500">Rules</dt>
            <dd className="font-semibold">{rules ? `${rules.split("\n").length} rule(s)` : "—"}</dd>
          </div>
        </dl>
      </Panel>
    </div>
  );
}
