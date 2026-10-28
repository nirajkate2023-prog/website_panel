"use client";

import { useActionState } from "react";

type Result = { ok: boolean; message: string };

/**
 * Wraps a server action in a form and reports the action's result inline, so every
 * add/save form in the panel behaves the same way without bespoke state handling.
 */
export default function ActionForm({
  action,
  children,
  submitLabel,
  className,
  buttonClassName,
  compact,
}: {
  action: (formData: FormData) => Promise<Result>;
  children?: React.ReactNode;
  submitLabel: string;
  className?: string;
  buttonClassName?: string;
  compact?: boolean;
}) {
  const [state, formAction, pending] = useActionState<Result | null, FormData>(
    async (_previous, formData) => action(formData),
    null,
  );

  return (
    <form action={formAction} className={className}>
      {children}
      <div className={compact ? "" : "mt-3"}>
        <button type="submit" disabled={pending} className={buttonClassName ?? "btn btn-green"}>
          {pending ? "Saving…" : submitLabel}
        </button>
        {state && !state.ok ? (
          <p className="mt-2 text-sm text-red-600">{state.message}</p>
        ) : null}
        {state && state.ok ? (
          <p className="mt-2 text-sm text-green-700">{state.message}</p>
        ) : null}
      </div>
    </form>
  );
}
