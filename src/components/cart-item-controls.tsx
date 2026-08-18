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
    <div className="mt-5 border-t border-slate-200 pt-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-slate-800">Quantity</p>
          <div className="mt-2 flex items-center gap-2" aria-label="Cart item quantity">
            <form action={updateAction}>
              <input type="hidden" name="itemId" value={itemId} />
              <input type="hidden" name="quantity" value={quantity - 1} />
              <button
                type="submit"
                disabled={pending || quantity <= 1}
                aria-label="Decrease cart quantity"
                className="h-11 w-11 rounded-lg border border-slate-300 bg-white text-xl font-semibold text-slate-800 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800 disabled:cursor-not-allowed disabled:opacity-45"
              >
                -
              </button>
            </form>
            <output
              aria-live="polite"
              className="flex h-11 min-w-12 items-center justify-center rounded-lg bg-slate-100 px-3 font-semibold text-slate-950"
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
                className="h-11 w-11 rounded-lg border border-slate-300 bg-white text-xl font-semibold text-slate-800 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800 disabled:cursor-wait disabled:opacity-55"
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
            className="min-h-11 rounded-lg border border-red-300 px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700 disabled:cursor-wait disabled:opacity-55"
          >
            {removing ? "Removing..." : "Remove item"}
          </button>
        </form>
      </div>

      {updateState.message && (
        <p
          role={updateState.status === "error" ? "alert" : "status"}
          className={`mt-3 text-sm ${
            updateState.status === "error" ? "text-red-700" : "text-emerald-700"
          }`}
        >
          {updateState.message}
        </p>
      )}
      {removeState.status === "error" && (
        <p role="alert" className="mt-3 text-sm text-red-700">
          {removeState.message}
        </p>
      )}
    </div>
  );
}
