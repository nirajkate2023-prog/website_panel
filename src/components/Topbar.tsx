"use client";

import { Bell, Menu, Search, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { ClientOption, SessionInfo } from "@/lib/types";

export type { SessionInfo };

const TITLES: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/request": "Request",
  "/reports": "Reports",
  "/suspicious": "Suspicious",
  "/clients": "Clients",
  "/broadcast": "Broadcast",
  "/videos": "Videos",
  "/bank-account": "Bank Account",
  "/settings": "Settings",
  "/configurations": "Configurations",
  "/profile": "Profile",
  "/mfa": "Two FA Settings",
  "/permissions": "Employee Permission",
};

export default function Topbar({
  session,
  onToggleMenu,
}: {
  session: SessionInfo;
  onToggleMenu: () => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const title = TITLES[pathname] ?? "Dashboard";
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ClientOption[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/clients/search?q=${encodeURIComponent(query)}`, {
          signal: controller.signal,
        });
        if (response.ok) setResults((await response.json()).clients ?? []);
      } catch {
        /* aborted */
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, open]);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <header className="sticky top-0 z-30 border-b border-zinc-200 bg-white">
      <div className="flex h-16 items-center gap-3 px-4 sm:px-6">
        <button
          type="button"
          onClick={onToggleMenu}
          aria-label="Toggle navigation"
          className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-zinc-500 hover:bg-zinc-100"
        >
          <Menu className="h-5 w-5" />
        </button>

        <h1 className="truncate text-xl font-bold text-zinc-800 sm:text-2xl">{title}</h1>

        <div className="ml-auto flex items-center gap-2">
          <div ref={boxRef} className="relative">
            <div className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2">
              <Search className="h-4 w-4 text-zinc-400" />
              <input
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setOpen(true);
                }}
                onFocus={() => setOpen(true)}
                placeholder="Search e.g. Dashboard..."
                className="w-36 bg-transparent text-sm outline-none placeholder:text-zinc-400 sm:w-56"
              />
            </div>

            {open ? (
              <div className="absolute right-0 top-12 w-80 rounded-xl border border-zinc-200 bg-white p-3 shadow-lg">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-sm font-semibold text-zinc-700">Global Client Search</p>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="grid h-6 w-6 place-items-center rounded text-zinc-400 hover:bg-zinc-100"
                    aria-label="Close search"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <input
                  autoFocus
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search"
                  className="field mb-2"
                />
                <div className="max-h-64 space-y-1 overflow-auto">
                  {loading && results.length === 0 ? (
                    <p className="px-1 py-2 text-xs text-zinc-400">Searching…</p>
                  ) : null}
                  {!loading && results.length === 0 ? (
                    <p className="px-1 py-2 text-xs text-zinc-400">No clients found</p>
                  ) : null}
                  {results.map((client) => (
                    <button
                      key={client.id}
                      type="button"
                      onClick={() => {
                        setOpen(false);
                        router.push(`/clients?user=${encodeURIComponent(client.code)}`);
                      }}
                      className="flex w-full items-center justify-between rounded-lg px-2 py-2 text-left text-sm hover:bg-zinc-50"
                    >
                      <span className="font-medium text-zinc-700">{client.username}</span>
                      <span className="font-mono text-xs text-zinc-400">{client.code}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          <button
            type="button"
            aria-label="Notifications"
            className="relative grid h-9 w-9 place-items-center rounded-lg text-zinc-500 hover:bg-zinc-100"
          >
            <Bell className="h-5 w-5" />
            <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
          </button>

          <div className="grid h-9 w-9 place-items-center rounded-full bg-green-600 text-xs font-bold text-white">
            {session.username.slice(0, 1).toUpperCase()}
          </div>
        </div>
      </div>
    </header>
  );
}
