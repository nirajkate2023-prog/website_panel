"use client";

import { useState, useTransition } from "react";
import { decideRequestAction } from "@/app/actions/requests";
import type { RequestStatus } from "@prisma/client";

const DECISIONS: { status: RequestStatus; label: string; className: string }[] = [
  { status: "APPROVED", label: "Approve", className: "btn btn-green px-3 py-1 text-xs" },
  { status: "ON_HOLD", label: "Hold", className: "btn btn-ghost px-3 py-1 text-xs" },
  { status: "REJECTED", label: "Reject", className: "btn btn-red px-3 py-1 text-xs" },
];

export default function RequestActions({ id, status }: { id: string; status: RequestStatus }) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  if (status !== "PENDING") {
    return <span className="text-xs text-zinc-400">—</span>;
  }

  const submit = (next: RequestStatus) =>
    startTransition(async () => {
      const formData = new FormData();
      formData.set("id", id);
      formData.set("status", next);
      const result = await decideRequestAction(formData);
      setMessage(result.message);
    });

  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-wrap gap-1">
        {DECISIONS.map((decision) => (
          <button
            key={decision.status}
            type="button"
            disabled={pending}
            onClick={() => submit(decision.status)}
            className={decision.className}
          >
            {decision.label}
          </button>
        ))}
      </div>
      {message ? <span className="text-[11px] text-zinc-500">{message}</span> : null}
    </div>
  );
}
