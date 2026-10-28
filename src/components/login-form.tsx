"use client";

import { useActionState } from "react";
import {
  loginAction,
  type AuthFormState,
} from "@/features/auth/actions";

import { buttonStyles } from "@/components/ui/button";
import { fieldStyles } from "@/components/ui/field";
const INITIAL_STATE: AuthFormState = {};

export function LoginForm({ nextPath }: { nextPath: string }) {
  const [state, formAction, pending] = useActionState(
    loginAction,
    INITIAL_STATE,
  );

  return (
    <form action={formAction} className="mt-7 space-y-5">
      <input type="hidden" name="next" value={nextPath} />

      <div>
        <label htmlFor="login-email" className="text-body-sm font-semibold text-neutral-800">
          Email address
        </label>
        <input
          id="login-email"
          name="email"
          type="email"
          autoComplete="email"
          required
          aria-describedby={state.fieldErrors?.email ? "login-email-error" : undefined}
          className={fieldStyles("mt-2")}
        />
        {state.fieldErrors?.email && (
          <p id="login-email-error" className="mt-2 text-body-sm text-red-700">
            {state.fieldErrors.email}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="login-password" className="text-body-sm font-semibold text-neutral-800">
          Password
        </label>
        <input
          id="login-password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          aria-describedby={state.fieldErrors?.password ? "login-password-error" : undefined}
          className={fieldStyles("mt-2")}
        />
        {state.fieldErrors?.password && (
          <p id="login-password-error" className="mt-2 text-body-sm text-red-700">
            {state.fieldErrors.password}
          </p>
        )}
      </div>

      {state.message && (
        <p
          role="alert"
          aria-live="polite"
          className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-body-sm text-red-800"
        >
          {state.message}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className={buttonStyles({ variant: "primary", size: "lg", className: "w-full" })}
      >
        {pending ? "Signing in..." : "Sign in"}
      </button>
    </form>
  );
}
