import AppShell from "@/components/AppShell";
import { requireUser } from "@/lib/auth";
import type { SessionInfo } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();

  const session: SessionInfo = {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    role: user.role,
    whiteLabelName: user.whiteLabel?.name ?? null,
    masterName: user.master?.displayName ?? null,
  };

  return <AppShell session={session}>{children}</AppShell>;
}
