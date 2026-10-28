import type { Metadata } from "next";
import Link from "next/link";
import { AdminReviewModerationControl } from "@/components/admin-review-moderation-control";
import { FeedbackState } from "@/components/feedback-state";
import { getAdminReviews } from "@/features/admin/api";
import { apiErrorMessage } from "@/lib/api";
import { formatDateTime } from "@/lib/dates";

import { Eyebrow } from "@/components/ui/eyebrow";
import { Badge } from "@/components/ui/badge";
export const metadata: Metadata = { title: "Review moderation" };

export default async function AdminReviewsPage() {
  let reviews;
  try { reviews = await getAdminReviews(); } catch (error) { return <FeedbackState title="Reviews unavailable" description={apiErrorMessage(error)} />; }
  return <><div><Eyebrow>Moderation</Eyebrow><h2 className="mt-2 text-heading font-bold tracking-tight text-brand-strong">Product Reviews</h2><p className="mt-3 text-neutral-600">Hide or restore customer Reviews. Review content remains customer-owned and cannot be edited here.</p></div>
    {reviews.length === 0 ? <div className="mt-8"><FeedbackState title="No Reviews" description="Customer Product Reviews will appear here." /></div> : <div className="mt-8 grid gap-5 lg:grid-cols-2">{reviews.map((review) => <article key={review.id} className="rounded-md border border-line bg-surface p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><Link href={`/products/${review.product.slug}`} className="font-bold text-brand-strong hover:text-brand focus-visible:outline-2 focus-visible:outline-brand">{review.product.name}</Link><Eyebrow className="mt-1 text-neutral-600">Review #{review.id} · Reviewer User #{review.userId}</Eyebrow></div><Badge variant={review.isVisible ? "success" : "neutral"} className="uppercase tracking-eyebrow">{review.isVisible ? "Visible" : "Hidden"}</Badge></div><p className="mt-4 font-bold text-amber-700" aria-label={`${review.rating} out of 5 stars`}>{"★".repeat(review.rating)}<span className="text-neutral-300">{"★".repeat(5 - review.rating)}</span></p>{review.title && <h3 className="mt-3 text-title font-bold text-brand-strong">{review.title}</h3>}{review.body && <p className="mt-2 whitespace-pre-wrap text-body text-neutral-700">{review.body}</p>} {!review.title && !review.body && <p className="mt-3 text-body-sm italic text-neutral-600">Rating-only Review</p>}<p className="mt-4 text-body-sm text-neutral-600">Created {formatDateTime(review.createdAt)} · Updated {formatDateTime(review.updatedAt)}</p><div className="mt-5 border-t border-line pt-4"><AdminReviewModerationControl reviewId={review.id} isVisible={review.isVisible} /></div></article>)}</div>}
  </>;
}
