"use client";

import { useActionState } from "react";
import {
  registerAction,
  type AuthFormState,
} from "@/features/auth/actions";

import { buttonStyles } from "@/components/ui/button";
import { fieldStyles } from "@/components/ui/field";
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
        <label htmlFor="register-email" className="text-body-sm font-semibold text-neutral-800">
          Email address
        </label>
        <input
          id="register-email"
          name="email"
          type="email"
          autoComplete="email"
          required
          aria-describedby={state.fieldErrors?.email ? "register-email-error" : undefined}
          className={fieldStyles("mt-2")}
        />
        {state.fieldErrors?.email && (
          <p id="register-email-error" className="mt-2 text-body-sm text-red-700">
            {state.fieldErrors.email}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="register-password" className="text-body-sm font-semibold text-neutral-800">
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
          className={fieldStyles("mt-2")}
        />
        <p id="register-password-help" className="mt-2 text-body-sm text-neutral-600">
          Use at least 8 characters.
        </p>
        {state.fieldErrors?.password && (
          <p id="register-password-error" className="mt-2 text-body-sm text-red-700">
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
        {pending ? "Creating account..." : "Create account"}
      </button>
    </form>
  );
}
