"use client";

import { useState } from "react";
import Sidebar from "@/components/Sidebar";
import Topbar, { type SessionInfo } from "@/components/Topbar";
import FloatingTools from "@/components/FloatingTools";

export default function AppShell({
  session,
  children,
}: {
  session: SessionInfo;
  children: React.ReactNode;
}) {
  const [menuOpen, setMenuOpen] = useState(true);

  return (
    <div className="flex min-h-screen">
      <Sidebar session={session} open={menuOpen} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar session={session} onToggleMenu={() => setMenuOpen((open) => !open)} />
        <main className="flex-1 px-4 py-5 sm:px-6">{children}</main>
      </div>
      <FloatingTools />
    </div>
  );
}
