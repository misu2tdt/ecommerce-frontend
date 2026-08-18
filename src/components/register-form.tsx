"use client";

import { useActionState } from "react";
import {
  registerAction,
  type AuthFormState,
} from "@/features/auth/actions";

const INITIAL_STATE: AuthFormState = {};

export function RegisterForm({ nextPath }: { nextPath: string }) {
  const [state, formAction, pending] = useActionState(
    registerAction,
    INITIAL_STATE,
  );

  return (
    <form action={formAction} className="mt-7 space-y-5">
      <input type="hidden" name="next" value={nextPath} />

      <div>
        <label htmlFor="register-email" className="text-sm font-semibold text-slate-800">
          Email address
        </label>
        <input
          id="register-email"
          name="email"
          type="email"
          autoComplete="email"
          required
          aria-describedby={state.fieldErrors?.email ? "register-email-error" : undefined}
          className="mt-2 min-h-12 w-full rounded-lg border border-slate-300 bg-white px-4 text-slate-950 shadow-sm outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20"
        />
        {state.fieldErrors?.email && (
          <p id="register-email-error" className="mt-2 text-sm text-red-700">
            {state.fieldErrors.email}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="register-password" className="text-sm font-semibold text-slate-800">
          Password
        </label>
        <input
          id="register-password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
          aria-describedby={
            state.fieldErrors?.password
              ? "register-password-help register-password-error"
              : "register-password-help"
          }
          className="mt-2 min-h-12 w-full rounded-lg border border-slate-300 bg-white px-4 text-slate-950 shadow-sm outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20"
        />
        <p id="register-password-help" className="mt-2 text-sm text-slate-500">
          Use at least 8 characters.
        </p>
        {state.fieldErrors?.password && (
          <p id="register-password-error" className="mt-2 text-sm text-red-700">
            {state.fieldErrors.password}
          </p>
        )}
      </div>

      {state.message && (
        <p
          role="alert"
          aria-live="polite"
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
        >
          {state.message}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="min-h-12 w-full rounded-lg bg-emerald-800 px-5 py-3 font-semibold text-white transition hover:bg-emerald-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800 disabled:cursor-wait disabled:opacity-65"
      >
        {pending ? "Creating account..." : "Create account"}
      </button>
    </form>
  );
}
