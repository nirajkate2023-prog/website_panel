"use client";

import { useRef, useTransition } from "react";
import { selectClientAction } from "@/app/actions/scope";
import type { ClientOption } from "@/lib/types";

/**
 * The "Select Client" control that appears on every client-scoped page. It writes
 * the choice to a cookie so the whole panel stays on the same client.
 */
export default function ClientSelect({
  clients,
  selectedId,
  className,
}: {
  clients: ClientOption[];
  selectedId: string | null;
  className?: string;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      ref={formRef}
      action={selectClientAction}
      className={className}
      onSubmit={() => startTransition(() => {})}
    >
      <select
        name="clientId"
        defaultValue={selectedId ?? ""}
        onChange={() => formRef.current?.requestSubmit()}
        aria-label="Select Client"
        className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-700 outline-none focus:border-green-600"
      >
        <option value="">Select Client</option>
        {clients.map((client) => (
          <option key={client.id} value={client.id}>
            {client.username}
          </option>
        ))}
      </select>
      {pending ? <span className="ml-2 text-xs text-zinc-400">updating…</span> : null}
    </form>
  );
}
