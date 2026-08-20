"use client";

import { useActionState } from "react";
import {
  removeWishlistItemAction,
  type WishlistActionState,
} from "@/features/wishlist/actions";

const INITIAL_STATE: WishlistActionState = {};

export function WishlistRemoveControl({ productId }: { productId: number }) {
  const [state, action, pending] = useActionState(
    removeWishlistItemAction,
    INITIAL_STATE,
  );

  return (
    <form action={action}>
      <input type="hidden" name="productId" value={productId} />
      <input type="hidden" name="returnPath" value="/wishlist" />
      <button
        type="submit"
        disabled={pending}
        className="min-h-11 rounded-lg border border-red-300 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700 disabled:cursor-wait disabled:opacity-60"
      >
        {pending ? "Removing..." : "Remove"}
      </button>
      {state.status === "error" && (
        <p role="alert" className="mt-2 text-sm text-red-700">
          {state.message}
        </p>
      )}
    </form>
  );
}
