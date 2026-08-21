import type { Metadata } from "next";
import Link from "next/link";
import { AdminReviewModerationControl } from "@/components/admin-review-moderation-control";
import { FeedbackState } from "@/components/feedback-state";
import { getAdminReviews } from "@/features/admin/api";
import { apiErrorMessage } from "@/lib/api";
import { formatDateTime } from "@/lib/dates";

export const metadata: Metadata = { title: "Review moderation" };

export default async function AdminReviewsPage() {
  let reviews;
  try { reviews = await getAdminReviews(); } catch (error) { return <FeedbackState title="Reviews unavailable" description={apiErrorMessage(error)} />; }
  return <><div><p className="text-sm font-bold uppercase tracking-[0.16em] text-emerald-700">Moderation</p><h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">Product Reviews</h2><p className="mt-3 text-slate-600">Hide or restore customer Reviews. Review content remains customer-owned and cannot be edited here.</p></div>
    {reviews.length === 0 ? <div className="mt-8"><FeedbackState title="No Reviews" description="Customer Product Reviews will appear here." /></div> : <div className="mt-8 grid gap-5 lg:grid-cols-2">{reviews.map((review) => <article key={review.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex flex-wrap items-start justify-between gap-3"><div><Link href={`/products/${review.product.slug}`} className="font-bold text-slate-950 hover:text-emerald-800 focus-visible:outline-2 focus-visible:outline-emerald-800">{review.product.name}</Link><p className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Review #{review.id} · Reviewer User #{review.userId}</p></div><span className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide ${review.isVisible ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-700"}`}>{review.isVisible ? "Visible" : "Hidden"}</span></div><p className="mt-4 font-bold text-amber-700" aria-label={`${review.rating} out of 5 stars`}>{"★".repeat(review.rating)}<span className="text-slate-300">{"★".repeat(5 - review.rating)}</span></p>{review.title && <h3 className="mt-3 text-lg font-bold text-slate-950">{review.title}</h3>}{review.body && <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">{review.body}</p>} {!review.title && !review.body && <p className="mt-3 text-sm italic text-slate-500">Rating-only Review</p>}<p className="mt-4 text-xs text-slate-500">Created {formatDateTime(review.createdAt)} · Updated {formatDateTime(review.updatedAt)}</p><div className="mt-5 border-t border-slate-200 pt-4"><AdminReviewModerationControl reviewId={review.id} isVisible={review.isVisible} /></div></article>)}</div>}
  </>;
}
