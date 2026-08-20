"use client";

import { useActionState } from "react";
import {
  addWishlistItemAction,
  type WishlistActionState,
} from "@/features/wishlist/actions";

const INITIAL_STATE: WishlistActionState = {};

export function WishlistSaveControl({
  productId,
  productName,
  returnPath,
  compact = false,
}: {
  productId: number;
  productName: string;
  returnPath: string;
  compact?: boolean;
}) {
  const [state, action, pending] = useActionState(
    addWishlistItemAction,
    INITIAL_STATE,
  );

  return (
    <form action={action} className={compact ? "" : "mt-4"}>
      <input type="hidden" name="productId" value={productId} />
      <input type="hidden" name="returnPath" value={returnPath} />
      <button
        type="submit"
        disabled={pending}
        aria-label={`Save ${productName} to wishlist`}
        className={
          compact
            ? "min-h-10 rounded-full border border-emerald-800 bg-white/95 px-3 py-2 text-xs font-bold text-emerald-900 shadow-sm hover:bg-emerald-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800 disabled:cursor-wait disabled:opacity-60"
            : "min-h-11 w-full rounded-lg border border-emerald-800 px-4 py-2 font-semibold text-emerald-800 hover:bg-emerald-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800 disabled:cursor-wait disabled:opacity-60"
        }
      >
        {pending
          ? "Saving..."
          : state.status === "success"
            ? "Saved"
            : "Save to wishlist"}
      </button>
      {state.status === "error" && (
        <p role="alert" className="mt-2 text-sm text-red-700">
          {state.message}
        </p>
      )}
      {!compact && state.status === "success" && (
        <p role="status" className="mt-2 text-sm text-emerald-700">
          {state.message}
        </p>
      )}
    </form>
  );
}
