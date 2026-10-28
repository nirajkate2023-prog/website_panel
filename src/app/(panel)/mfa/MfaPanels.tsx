"use client";

import { CheckCircle2, Mail, ShieldCheck } from "lucide-react";
import { useActionState, useState, useTransition } from "react";
import {
  enableMfaAction,
  sendEmailOtpAction,
  setMfaDisabledAction,
  setTrustedDevicesAction,
  startMfaEnrolmentAction,
  verifyEmailOtpAction,
  type FormState,
} from "@/app/actions/account";

function Toggle({ on }: { on: boolean }) {
  return (
    <span
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition ${on ? "bg-green-600" : "bg-zinc-300"}`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${on ? "translate-x-4" : "translate-x-0.5"}`}
      />
    </span>
  );
}

export function MethodToggle({ disabled }: { disabled: boolean }) {
  const [pending, startTransition] = useTransition();

  const flip = () =>
    startTransition(async () => {
      const formData = new FormData();
      formData.set("disabled", disabled ? "false" : "true");
      await setMfaDisabledAction(formData);
    });

  return (
    <button
      type="button"
      onClick={flip}
      disabled={pending}
      className="flex items-center gap-3 rounded-lg border border-zinc-200 px-4 py-3 text-sm font-medium text-zinc-700"
    >
      <Toggle on={!disabled} />
      {disabled ? "2FA is disabled" : "2FA is enabled"}
    </button>
  );
}

export function TrustedDevicesToggle({ enabled }: { enabled: boolean }) {
  const [pending, startTransition] = useTransition();

  const flip = () =>
    startTransition(async () => {
      const formData = new FormData();
      formData.set("enabled", enabled ? "false" : "true");
      await setTrustedDevicesAction(formData);
    });

  return (
    <button
      type="button"
      onClick={flip}
      disabled={pending}
      className="flex items-center gap-3 rounded-lg border border-zinc-200 px-4 py-3 text-sm font-medium text-zinc-700"
    >
      <Toggle on={enabled} />
      {enabled ? "Trusted devices remembered" : "Trusted devices not remembered"}
    </button>
  );
}

export function EnrolmentCard({ enabled, secret }: { enabled: boolean; secret: string | null }) {
  const [state, setState] = useState<FormState>({});
  const [pending, startTransition] = useTransition();
  const [tokenState, tokenAction, verifying] = useActionState<FormState, FormData>(enableMfaAction, {});

  const start = () =>
    startTransition(async () => {
      setState(await startMfaEnrolmentAction());
    });

  return (
    <div className="rounded-xl border border-zinc-200 p-4">
      <div className="flex items-center gap-2">
        <ShieldCheck className={`h-5 w-5 ${enabled ? "text-green-600" : "text-zinc-400"}`} />
        <h3 className="text-sm font-bold text-zinc-800">2FA Authentication</h3>
      </div>
      <p className="mt-1 text-xs text-zinc-500">
        Secure your account with two-factor authentication (2FA).
      </p>

      <div className="mt-4 space-y-2 text-sm">
        <div className="flex items-center gap-2 rounded-lg bg-zinc-50 px-3 py-2">
          <Mail className="h-4 w-4 text-zinc-400" />
          <span className="font-medium">E-Mail</span>
          <span className="ml-auto text-xs text-zinc-400">Update your email configuration</span>
        </div>
        <div className="flex items-center gap-2 rounded-lg bg-zinc-50 px-3 py-2">
          <ShieldCheck className="h-4 w-4 text-zinc-400" />
          <span className="font-medium">MFA</span>
          <span className="ml-auto text-xs">
            {enabled ? (
              <span className="inline-flex items-center gap-1 text-green-600">
                <CheckCircle2 className="h-4 w-4" /> Active
              </span>
            ) : (
              <span className="text-zinc-400">Not enrolled</span>
            )}
          </span>
        </div>
      </div>

      {!enabled ? (
        <div className="mt-4 space-y-3">
          <button type="button" onClick={start} disabled={pending} className="btn btn-ghost">
            {pending ? "Preparing…" : "Generate authenticator secret"}
          </button>

          {state.secret ? (
            <div className="space-y-2 rounded-lg bg-zinc-50 p-3">
              <p className="text-xs text-zinc-500">
                Add this secret to your authenticator app, then confirm with a code.
              </p>
              <code className="block break-all rounded bg-white p-2 font-mono text-xs">
                {state.secret}
              </code>
              <p className="break-all text-[11px] text-zinc-400">{state.otpauth}</p>
              <form action={tokenAction} className="flex flex-wrap items-center gap-2">
                <input
                  name="token"
                  inputMode="numeric"
                  placeholder="6 digit code"
                  className="field w-40 tracking-[0.3em]"
                  required
                />
                <button type="submit" disabled={verifying} className="btn btn-green">
                  {verifying ? "Verifying…" : "Enable 2FA"}
                </button>
              </form>
              {tokenState.error ? <p className="text-sm text-red-600">{tokenState.error}</p> : null}
              {tokenState.ok ? <p className="text-sm text-green-700">{tokenState.message}</p> : null}
            </div>
          ) : null}

          {secret ? (
            <p className="text-[11px] text-zinc-400">A pending secret already exists on this account.</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function AddEmailCard({ email, verified }: { email: string | null; verified: boolean }) {
  const [pending, startTransition] = useTransition();
  const [devCode, setDevCode] = useState<string | null>(null);
  const [sendMessage, setSendMessage] = useState<string | null>(null);
  const [state, formAction, verifying] = useActionState<FormState, FormData>(verifyEmailOtpAction, {});

  const send = (formData: FormData) =>
    startTransition(async () => {
      const result = await sendEmailOtpAction(formData);
      setSendMessage(result.message ?? result.error ?? null);
      setDevCode(result.secret ?? null);
    });

  return (
    <div className="rounded-xl border border-zinc-200 p-4">
      <h3 className="text-sm font-bold text-zinc-800">Add Email ID</h3>
      <p className="mt-1 text-xs text-zinc-500">
        We will send a verification code to your email address.
      </p>

      <form action={send} className="mt-4 flex flex-wrap items-end gap-2">
        <div className="flex-1">
          <label className="label" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            defaultValue={email ?? ""}
            placeholder="Enter Your Email Address..."
            className="field"
            required
          />
        </div>
        <button type="submit" disabled={pending} className="btn btn-red">
          {pending ? "Sending…" : "Send code"}
        </button>
      </form>

      {sendMessage ? <p className="mt-2 text-sm text-zinc-600">{sendMessage}</p> : null}
      {devCode ? (
        <p className="mt-1 text-xs text-amber-600">
          Dev mode — no mailer configured, so the code is {devCode}
        </p>
      ) : null}

      <form action={formAction} className="mt-4 space-y-2">
        <label className="label" htmlFor="code">
          OTP Verify
        </label>
        <input
          id="code"
          name="code"
          inputMode="numeric"
          maxLength={6}
          placeholder="● ● ● ● ● ●"
          className="field w-56 text-center text-lg tracking-[0.5em]"
          required
        />
        <button type="submit" disabled={verifying} className="btn btn-green">
          {verifying ? "Verifying…" : "Verify"}
        </button>
        {state.error ? <p className="text-sm text-red-600">{state.error}</p> : null}
        {state.ok ? <p className="text-sm text-green-700">{state.message}</p> : null}
      </form>

      {verified ? (
        <p className="mt-3 inline-flex items-center gap-1 text-sm text-green-700">
          <CheckCircle2 className="h-4 w-4" /> Email configured
        </p>
      ) : null}
    </div>
  );
}
