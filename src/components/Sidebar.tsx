"use client";

import clsx from "clsx";
import {
  AlertTriangle,
  BarChart3,
  Inbox,
  KeyRound,
  Landmark,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Settings as SettingsIcon,
  ShieldCheck,
  UserCircle,
  Users,
  Video,
  Wrench,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { logoutAction } from "@/app/actions/auth";
import type { SessionInfo } from "@/lib/types";

const OPERATIONS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/request", label: "Request", icon: Inbox },
  { href: "/reports", label: "Reports", icon: BarChart3 },
  { href: "/suspicious", label: "Suspicious", icon: AlertTriangle },
  { href: "/clients", label: "Clients", icon: Users },
  { href: "/broadcast", label: "Broadcast", icon: Megaphone },
  { href: "/videos", label: "Videos", icon: Video },
  { href: "/bank-account", label: "Bank Account", icon: Landmark },
];

const ACCOUNT = [
  { href: "/settings", label: "Settings", icon: SettingsIcon },
  { href: "/configurations", label: "Configurations", icon: Wrench },
  { href: "/profile", label: "Profile", icon: UserCircle },
  { href: "/mfa", label: "MFA", icon: ShieldCheck },
  { href: "/permissions", label: "Permissions", icon: KeyRound },
];

export default function Sidebar({ session, open }: { session: SessionInfo; open: boolean }) {
  const pathname = usePathname();

  const renderItem = ({ href, label, icon: Icon }: (typeof OPERATIONS)[number]) => {
    const active = pathname === href || pathname.startsWith(`${href}/`);
    return (
      <Link
        key={href}
        href={href}
        className={clsx(
          "flex items-center gap-3 border-l-4 px-4 py-2.5 text-sm transition-colors",
          active
            ? "border-green-600 bg-green-50 font-semibold text-green-700"
            : "border-transparent text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900",
        )}
      >
        <Icon className="h-[18px] w-[18px] shrink-0" />
        <span className="truncate">{label}</span>
      </Link>
    );
  };

  return (
    <aside
      className={clsx(
        "shrink-0 overflow-hidden border-r border-zinc-200 bg-white transition-[width] duration-200",
        open ? "w-60" : "w-0",
      )}
    >
      <div className="flex h-16 items-center gap-2.5 border-b border-zinc-100 px-4">
        <span className="grid h-9 w-9 place-items-center rounded-lg bg-green-600 text-sm font-black text-white">
          Gi
        </span>
        <span className="text-lg font-bold tracking-tight text-zinc-800">Get-ID</span>
      </div>

      <div className="w-60 px-4 py-4">
        <p className="truncate text-sm font-bold text-zinc-800">{session.displayName}</p>
        <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400">
          {session.role.replace("_", " ")}
        </p>
      </div>

      <nav className="w-60 pb-4">
        {OPERATIONS.map(renderItem)}
        <div className="my-2 border-t border-zinc-100" />
        {ACCOUNT.map(renderItem)}

        <form action={logoutAction}>
          <button
            type="submit"
            className="flex w-full items-center gap-3 border-l-4 border-transparent px-4 py-2.5 text-sm text-red-600 transition-colors hover:bg-red-50"
          >
            <LogOut className="h-[18px] w-[18px] shrink-0" />
            <span>Logout</span>
          </button>
        </form>
      </nav>
    </aside>
  );
}
