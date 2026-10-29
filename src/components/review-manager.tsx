"use client";

import { useActionState, useState } from "react";
import {
  createReviewAction,
  deleteReviewAction,
  updateReviewAction,
  type ReviewActionState,
} from "@/features/reviews/actions";
import type { MyReview } from "@/types/reviews";

import { buttonStyles } from "@/components/ui/button";
import { fieldStyles } from "@/components/ui/field";
const INITIAL_STATE: ReviewActionState = {};

export function ReviewManager({
  productId,
  returnPath,
  review,
}: {
  productId: number;
  returnPath: string;
  review: MyReview | null;
}) {
  const saveAction = review ? updateReviewAction : createReviewAction;
  const [saveState, saveFormAction, saving] = useActionState(
    saveAction,
    INITIAL_STATE,
  );
  const [deleteState, deleteFormAction, deleting] = useActionState(
    deleteReviewAction,
    INITIAL_STATE,
  );
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  return (
    <div className="rounded-md border border-line bg-surface p-5 sm:p-6">
      <h3 className="text-title font-bold text-brand-strong">
        {review ? "Your review" : "Write a review"}
      </h3>
      <p className="mt-2 text-body text-neutral-600">
        You can review a product after your order for it has been delivered.
      </p>
      {review && !review.isVisible && (
        <p className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-body-sm text-amber-900">
          Your review is currently hidden from the public review list.
        </p>
      )}

      <form action={saveFormAction} className="mt-5 space-y-4">
        <ReviewIdentityFields productId={productId} returnPath={returnPath} />
        <div>
          <label
            htmlFor="review-rating"
            className="text-body-sm font-semibold text-neutral-800"
          >
            Rating
          </label>
          <select
            id="review-rating"
            name="rating"
            required
            defaultValue={review?.rating ?? ""}
            className={fieldStyles("mt-2")}
          >
            <option value="" disabled>
              Choose 1 to 5
            </option>
            {[5, 4, 3, 2, 1].map((rating) => (
              <option key={rating} value={rating}>
                {rating} {rating === 1 ? "star" : "stars"}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label
            htmlFor="review-title"
            className="text-body-sm font-semibold text-neutral-800"
          >
            Title <span className="font-normal text-neutral-600">(optional)</span>
          </label>
          <input
            id="review-title"
            name="title"
            maxLength={150}
            defaultValue={review?.title ?? ""}
            className={fieldStyles("mt-2")}
          />
        </div>
        <div>
          <label
            htmlFor="review-body"
            className="text-body-sm font-semibold text-neutral-800"
          >
            Review{" "}
            <span className="font-normal text-neutral-600">(optional)</span>
          </label>
          <textarea
            id="review-body"
            name="body"
            maxLength={5000}
            rows={5}
            defaultValue={review?.body ?? ""}
            className={fieldStyles("mt-2")}
          />
        </div>
        <button
          type="submit"
          disabled={saving || deleting}
          className={buttonStyles({ variant: "primary", size: "md", className: "w-full" })}
        >
          {saving ? "Saving..." : review ? "Update review" : "Publish review"}
        </button>
        <ActionMessage state={saveState} />
      </form>

      {review && (
        <div className="mt-5 border-t border-line pt-5">
          {!confirmingDelete ? (
            <button
              type="button"
              onClick={() => setConfirmingDelete(true)}
              disabled={saving || deleting}
              className="min-h-11 rounded-md border border-red-300 px-4 py-2 text-body-sm font-semibold text-red-700 hover:bg-red-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700 disabled:opacity-60"
            >
              Delete review
            </button>
          ) : (
            <div
              role="alert"
              className="rounded-md border border-red-200 bg-red-50 p-4"
            >
              <p className="font-semibold text-red-900">
                Permanently delete your review?
              </p>
              <p className="mt-1 text-body-sm text-red-800">
                This action cannot be undone.
              </p>
              <div className="mt-3 flex flex-wrap gap-3">
                <form action={deleteFormAction}>
                  <ReviewIdentityFields
                    productId={productId}
                    returnPath={returnPath}
                  />
                  <button
                    type="submit"
                    disabled={deleting}
                    className={buttonStyles({ variant: "danger", size: "md" })}
                  >
                    {deleting ? "Deleting..." : "Yes, delete review"}
                  </button>
                </form>
                <button
                  type="button"
                  onClick={() => setConfirmingDelete(false)}
                  disabled={deleting}
                  className={buttonStyles({ variant: "secondary", size: "md" })}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
          <ActionMessage state={deleteState} />
        </div>
      )}
    </div>
  );
}

function ReviewIdentityFields({
  productId,
  returnPath,
}: {
  productId: number;
  returnPath: string;
}) {
  return (
    <>
      <input type="hidden" name="productId" value={productId} />
      <input type="hidden" name="returnPath" value={returnPath} />
    </>
  );
}

function ActionMessage({ state }: { state: ReviewActionState }) {
  if (!state.message) return null;
  return (
    <p
      role={state.status === "error" ? "alert" : "status"}
      className={`rounded-md border px-3 py-2 text-body-sm ${
        state.status === "error"
          ? "border-red-200 bg-red-50 text-red-800"
          : "border-success/30 bg-success-soft text-success"
      }`}
    >
      {state.message}
    </p>
  );
}
