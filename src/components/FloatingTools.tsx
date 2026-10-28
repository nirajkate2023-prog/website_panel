"use client";

import { ArrowUp, Settings } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

const SHORTCUTS = [
  { href: "/request", label: "Wallet Requests" },
  { href: "/clients", label: "Clients" },
  { href: "/reports", label: "Reports" },
  { href: "/settings", label: "Settings" },
  { href: "/permissions", label: "Permissions" },
];

export default function FloatingTools() {
  const [open, setOpen] = useState(false);
  const [showTop, setShowTop] = useState(false);

  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 320);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="pointer-events-none fixed bottom-6 right-6 z-40 flex flex-col items-end gap-3">
      {open ? (
        <div className="pointer-events-auto w-48 overflow-hidden rounded-xl border border-zinc-200 bg-white py-1 shadow-lg">
          {SHORTCUTS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className="block px-3 py-2 text-sm text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
            >
              {item.label}
            </Link>
          ))}
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label="Quick actions"
        className="pointer-events-auto grid h-11 w-11 place-items-center rounded-lg bg-green-600 text-white shadow-lg transition hover:brightness-95"
      >
        <Settings className="h-5 w-5" />
      </button>

      {showTop ? (
        <button
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          aria-label="Scroll to top"
          className="pointer-events-auto grid h-10 w-10 place-items-center rounded-full bg-green-600 text-white shadow-lg transition hover:brightness-95"
        >
          <ArrowUp className="h-5 w-5" />
        </button>
      ) : null}
    </div>
  );
}
