"use client";

import { useActionState } from "react";
import {
  clearCartAction,
  type CartActionState,
} from "@/features/cart/actions";

const INITIAL_STATE: CartActionState = {};

export function ClearCartControl() {
  const [state, formAction, pending] = useActionState(
    clearCartAction,
    INITIAL_STATE,
  );

  return (
    <div>
      <form action={formAction}>
        <button
          type="submit"
          disabled={pending}
          className="min-h-11 rounded-lg border border-red-300 px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700 disabled:cursor-wait disabled:opacity-55"
        >
          {pending ? "Clearing cart..." : "Clear entire cart"}
        </button>
      </form>
      {state.status === "error" && (
        <p role="alert" className="mt-2 text-sm text-red-700">
          {state.message}
        </p>
      )}
    </div>
  );
}
