"use client";

import { useActionState } from "react";
import {
  addWishlistItemAction,
  type WishlistActionState,
} from "@/features/wishlist/actions";
import { buttonStyles } from "@/components/ui/button";

const INITIAL_STATE: WishlistActionState = {};

// `compact` is the product-card mode: an icon-only heart on the image.
// Without it, the full-width text button used on the product page.
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

  if (compact) {
    return (
      <form action={action} className="relative">
        <input type="hidden" name="productId" value={productId} />
        <input type="hidden" name="returnPath" value={returnPath} />
        {/* The button is the 44px touch target; the circle is just what you see. */}
        <button
          type="submit"
          disabled={pending}
          aria-label={`Save ${productName} to wishlist`}
          className="group/heart inline-flex h-11 w-11 items-center justify-center focus-visible:outline-none"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-full border border-line bg-surface text-brand transition group-hover/heart:bg-brand-soft group-focus-visible/heart:outline-2 group-focus-visible/heart:outline-offset-2 group-focus-visible/heart:outline-brand group-disabled/heart:opacity-60">
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="h-[18px] w-[18px]"
              fill={state.status === "success" ? "currentColor" : "none"}
              stroke="currentColor"
              strokeWidth="1.75"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
              />
            </svg>
          </span>
        </button>
        {state.status === "success" && (
          <span role="status" className="sr-only">
            Saved to wishlist
          </span>
        )}
        {state.status === "error" && (
          <p
            role="alert"
            className="absolute right-0 top-full z-20 mt-1 w-44 rounded-md border border-line bg-surface p-2 text-body-sm text-red-700"
          >
            {state.message}
          </p>
        )}
      </form>
    );
  }

  return (
    <form action={action} className="mt-4">
      <input type="hidden" name="productId" value={productId} />
      <input type="hidden" name="returnPath" value={returnPath} />
      <button
        type="submit"
        disabled={pending}
        aria-label={`Save ${productName} to wishlist`}
        className={buttonStyles({
          variant: "secondary",
          size: "md",
          className: "w-full",
        })}
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
      {state.status === "success" && (
        <p role="status" className="mt-2 text-body-sm text-success">
          {state.message}
        </p>
      )}
    </form>
  );
}
