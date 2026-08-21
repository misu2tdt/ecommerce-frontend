"use client";

import { useActionState } from "react";
import { updateReviewVisibilityAction, type AdminActionState } from "@/features/admin/actions";

const INITIAL_STATE: AdminActionState = {};

export function AdminReviewModerationControl({ reviewId, isVisible }: { reviewId: number; isVisible: boolean }) {
  const [state, action, pending] = useActionState(updateReviewVisibilityAction, INITIAL_STATE);
  const targetVisible = !isVisible;
  return (
    <form action={action} onSubmit={(event) => {
      if (!targetVisible && !window.confirm("Hide this Review from the public storefront and rating aggregates?")) event.preventDefault();
    }}>
      <input type="hidden" name="reviewId" value={reviewId} />
      <input type="hidden" name="isVisible" value={String(targetVisible)} />
      {state.message && <p role={state.status === "error" ? "alert" : "status"} className={`mb-3 rounded-lg border px-3 py-2 text-sm ${state.status === "error" ? "border-red-200 bg-red-50 text-red-800" : "border-emerald-200 bg-emerald-50 text-emerald-800"}`}>{state.message}</p>}
      <button type="submit" disabled={pending} className={`min-h-10 rounded-lg px-4 py-2 text-sm font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-wait disabled:opacity-60 ${targetVisible ? "bg-emerald-800 hover:bg-emerald-900 focus-visible:outline-emerald-800" : "bg-red-700 hover:bg-red-800 focus-visible:outline-red-800"}`}>{pending ? "Updating..." : targetVisible ? "Restore Review" : "Hide Review"}</button>
    </form>
  );
}
