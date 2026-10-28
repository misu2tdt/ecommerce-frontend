"use client";

import { useActionState } from "react";
import {
  addWishlistItemAction,
  type WishlistActionState,
} from "@/features/wishlist/actions";
import { buttonStyles } from "@/components/ui/button";

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
            ? buttonStyles({ variant: "secondary", size: "sm" })
            : buttonStyles({ variant: "secondary", size: "md", className: "w-full" })
        }
      >
        {pending
          ? "Saving..."
          : state.status === "success"
            ? "Saved"
            : "Save to wishlist"}
      </button>
      {state.status === "error" && (
        <p role="alert" className="mt-2 text-body-sm text-red-700">
          {state.message}
        </p>
      )}
      {!compact && state.status === "success" && (
        <p role="status" className="mt-2 text-body-sm text-success">
          {state.message}
        </p>
      )}
    </form>
  );
}
