"use client";

import { Eye, EyeOff } from "lucide-react";
import { useActionState, useState } from "react";
import { changePasswordAction, type FormState } from "@/app/actions/account";

export default function PasswordForm() {
  const [state, formAction, pending] = useActionState<FormState, FormData>(changePasswordAction, {});
  const [visible, setVisible] = useState(false);

  return (
    <form action={formAction} className="max-w-lg space-y-4">
      {[
        { name: "current", label: "Current Password", placeholder: "" },
        { name: "next", label: "New Password", placeholder: "New Password" },
        { name: "confirm", label: "Confirm Password", placeholder: "Confirm Password" },
      ].map((field) => (
        <div key={field.name}>
          <label className="label" htmlFor={field.name}>
            {field.label}
          </label>
          <div className="relative">
            <input
              id={field.name}
              name={field.name}
              type={visible ? "text" : "password"}
              placeholder={field.placeholder}
              className="field pr-10"
              required
            />
            <button
              type="button"
              onClick={() => setVisible((value) => !value)}
              aria-label={visible ? "Hide passwords" : "Show passwords"}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-zinc-400 hover:bg-zinc-100"
            >
              {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>
      ))}

      {state.error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      ) : null}
      {state.ok ? (
        <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">{state.message}</p>
      ) : null}

      <div className="flex justify-end">
        <button type="submit" disabled={pending} className="btn btn-green">
          {pending ? "Saving…" : "Submit"}
        </button>
      </div>
    </form>
  );
}
