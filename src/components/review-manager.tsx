"use client";

import { useActionState, useState } from "react";
import {
  createReviewAction,
  deleteReviewAction,
  updateReviewAction,
  type ReviewActionState,
} from "@/features/reviews/actions";
import type { MyReview } from "@/types/reviews";

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
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <h3 className="text-lg font-bold text-slate-950">
        {review ? "Your review" : "Write a review"}
      </h3>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        Reviews can be submitted after the backend confirms a delivered purchase
        of this product.
      </p>
      {review && !review.isVisible && (
        <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Your review is currently hidden from the public review list.
        </p>
      )}

      <form action={saveFormAction} className="mt-5 space-y-4">
        <ReviewIdentityFields productId={productId} returnPath={returnPath} />
        <div>
          <label
            htmlFor="review-rating"
            className="text-sm font-semibold text-slate-800"
          >
            Rating
          </label>
          <select
            id="review-rating"
            name="rating"
            required
            defaultValue={review?.rating ?? ""}
            className="mt-2 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-slate-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800"
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
            className="text-sm font-semibold text-slate-800"
          >
            Title <span className="font-normal text-slate-500">(optional)</span>
          </label>
          <input
            id="review-title"
            name="title"
            maxLength={150}
            defaultValue={review?.title ?? ""}
            className="mt-2 min-h-11 w-full rounded-lg border border-slate-300 px-3 text-slate-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800"
          />
        </div>
        <div>
          <label
            htmlFor="review-body"
            className="text-sm font-semibold text-slate-800"
          >
            Review{" "}
            <span className="font-normal text-slate-500">(optional)</span>
          </label>
          <textarea
            id="review-body"
            name="body"
            maxLength={5000}
            rows={5}
            defaultValue={review?.body ?? ""}
            className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800"
          />
        </div>
        <button
          type="submit"
          disabled={saving || deleting}
          className="min-h-11 w-full rounded-lg bg-emerald-800 px-4 py-2 font-semibold text-white hover:bg-emerald-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800 disabled:cursor-wait disabled:bg-slate-300"
        >
          {saving ? "Saving..." : review ? "Update review" : "Publish review"}
        </button>
        <ActionMessage state={saveState} />
      </form>

      {review && (
        <div className="mt-5 border-t border-slate-200 pt-5">
          {!confirmingDelete ? (
            <button
              type="button"
              onClick={() => setConfirmingDelete(true)}
              disabled={saving || deleting}
              className="min-h-11 rounded-lg border border-red-300 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700 disabled:opacity-60"
            >
              Delete review
            </button>
          ) : (
            <div
              role="alert"
              className="rounded-lg border border-red-200 bg-red-50 p-4"
            >
              <p className="font-semibold text-red-900">
                Permanently delete your review?
              </p>
              <p className="mt-1 text-sm text-red-800">
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
                    className="min-h-11 rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white hover:bg-red-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700 disabled:cursor-wait disabled:opacity-60"
                  >
                    {deleting ? "Deleting..." : "Yes, delete review"}
                  </button>
                </form>
                <button
                  type="button"
                  onClick={() => setConfirmingDelete(false)}
                  disabled={deleting}
                  className="min-h-11 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-700 disabled:opacity-60"
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
      className={`rounded-lg border px-3 py-2 text-sm ${
        state.status === "error"
          ? "border-red-200 bg-red-50 text-red-800"
          : "border-emerald-200 bg-emerald-50 text-emerald-800"
      }`}
    >
      {state.message}
    </p>
  );
}
