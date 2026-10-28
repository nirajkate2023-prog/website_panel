"use client";

import { useActionState } from "react";
import { loginAction, type LoginState } from "@/app/actions/auth";

export default function LoginForm() {
  const [state, formAction, pending] = useActionState<LoginState, FormData>(loginAction, {});

  return (
    <form action={formAction} className="card space-y-4 p-6">
      <div>
        <label className="label" htmlFor="username">
          Username
        </label>
        <input id="username" name="username" autoComplete="username" required className="field" />
      </div>

      <div>
        <label className="label" htmlFor="password">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="field"
        />
      </div>

      {state.otpRequired ? (
        <div>
          <label className="label" htmlFor="token">
            Authentication code
          </label>
          <input
            id="token"
            name="token"
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="6 digit code"
            className="field tracking-[0.3em]"
          />
          <p className="mt-1 text-xs text-zinc-400">
            Open your authenticator app and enter the current code.
          </p>
        </div>
      ) : null}

      {state.error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      ) : null}

      <button type="submit" disabled={pending} className="btn btn-green w-full">
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
