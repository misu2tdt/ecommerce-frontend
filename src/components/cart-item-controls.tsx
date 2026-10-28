"use client";

import { useActionState } from "react";
import {
  removeCartItemAction,
  updateCartItemAction,
  type CartActionState,
} from "@/features/cart/actions";

const INITIAL_STATE: CartActionState = {};

export function CartItemControls({
  itemId,
  quantity,
}: {
  itemId: number;
  quantity: number;
}) {
  const [updateState, updateAction, updating] = useActionState(
    updateCartItemAction,
    INITIAL_STATE,
  );
  const [removeState, removeAction, removing] = useActionState(
    removeCartItemAction,
    INITIAL_STATE,
  );
  const pending = updating || removing;

  return (
    <div className="mt-5 border-t border-line pt-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-body-sm font-semibold text-neutral-800">Quantity</p>
          <div className="mt-2 flex items-center gap-2" aria-label="Cart item quantity">
            <form action={updateAction}>
              <input type="hidden" name="itemId" value={itemId} />
              <input type="hidden" name="quantity" value={quantity - 1} />
              <button
                type="submit"
                disabled={pending || quantity <= 1}
                aria-label="Decrease cart quantity"
                className="h-11 w-11 rounded-md border border-field-border bg-surface text-title font-semibold text-neutral-800 hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-45"
              >
                -
              </button>
            </form>
            <output
              aria-live="polite"
              className="flex h-11 min-w-12 items-center justify-center rounded-md bg-brand-soft px-3 font-semibold text-brand-strong"
            >
              {quantity}
            </output>
            <form action={updateAction}>
              <input type="hidden" name="itemId" value={itemId} />
              <input type="hidden" name="quantity" value={quantity + 1} />
              <button
                type="submit"
                disabled={pending}
                aria-label="Increase cart quantity"
                className="h-11 w-11 rounded-md border border-field-border bg-surface text-title font-semibold text-neutral-800 hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-wait disabled:opacity-55"
              >
                +
              </button>
            </form>
          </div>
        </div>

        <form action={removeAction}>
          <input type="hidden" name="itemId" value={itemId} />
          <button
            type="submit"
            disabled={pending}
            className="min-h-11 rounded-md border border-red-300 px-4 py-2 text-body-sm font-semibold text-red-700 transition hover:bg-red-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700 disabled:cursor-wait disabled:opacity-55"
          >
            {removing ? "Removing..." : "Remove item"}
          </button>
        </form>
      </div>

      {updateState.message && (
        <p
          role={updateState.status === "error" ? "alert" : "status"}
          className={`mt-3 text-body-sm ${
            updateState.status === "error" ? "text-red-700" : "text-success"
          }`}
        >
          {updateState.message}
        </p>
      )}
      {removeState.status === "error" && (
        <p role="alert" className="mt-3 text-body-sm text-red-700">
          {removeState.message}
        </p>
      )}
    </div>
  );
}
