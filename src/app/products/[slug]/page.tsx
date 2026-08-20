import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FeedbackState } from "@/components/feedback-state";
import { ProductGallery } from "@/components/product-gallery";
import { ProductPurchasePanel } from "@/components/product-purchase-panel";
import { ReviewManager } from "@/components/review-manager";
import { WishlistSaveControl } from "@/components/wishlist-save-control";
import { buildLoginHref } from "@/features/auth/redirects";
import { getProductBySlug } from "@/features/catalog/api";
import { getMyReview, getPublicReviews } from "@/features/reviews/api";
import {
  buildCatalogHref,
  buildProductDetailHref,
  parseProductFilters,
  type CatalogSearchParams,
} from "@/features/catalog/search-params";
import { ApiError, apiErrorMessage } from "@/lib/api";
import type { ProductDetail } from "@/types/catalog";
import type { MyReview, PublicReview } from "@/types/reviews";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  return { title: slug.replaceAll("-", " ") };
}

export default async function ProductDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<CatalogSearchParams>;
}) {
  const { slug } = await params;
  const filters = parseProductFilters(await searchParams);
  const backHref = buildCatalogHref(filters);
  const productHref = buildProductDetailHref(slug, filters);
  const result = await loadProduct(slug);

  if ("notFound" in result) notFound();
  if ("error" in result) {
    return (
      <section className="mx-auto max-w-6xl px-6 py-16">
        <FeedbackState title="Product unavailable" description={result.error} />
      </section>
    );
  }

  const product = result.data;
  const reviewData = await loadReviews(product.id);
  return (
    <article className="mx-auto max-w-6xl px-6 py-10 sm:py-14">
      <Link
        href={backHref}
        className="inline-flex min-h-11 items-center text-sm font-semibold text-emerald-800 hover:text-emerald-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800"
      >
        Back to products
      </Link>

      <div className="mt-6 grid gap-10 lg:grid-cols-[minmax(0,1.08fr)_minmax(22rem,0.92fr)] lg:items-start">
        <ProductGallery images={product.images} productName={product.name} />

        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-emerald-700">
            {product.category.name}
            {product.brand ? ` / ${product.brand.name}` : ""}
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
            {product.name}
          </h1>
          <p className="mt-4 text-sm text-slate-500">
            {product.averageRating === null
              ? "No reviews yet"
              : `Rating ${product.averageRating.toFixed(1)} / 5 from ${product.reviewCount} ${
                  product.reviewCount === 1 ? "review" : "reviews"
                }`}
          </p>
          <p className="mt-6 leading-7 text-slate-600">
            {product.description ||
              "No description is available for this product."}
          </p>

          <WishlistSaveControl
            productId={product.id}
            productName={product.name}
            returnPath={productHref}
          />

          <ProductPurchasePanel
            variants={product.variants}
            returnPath={productHref}
          />
        </div>
      </div>

      <section
        aria-labelledby="reviews-heading"
        className="mt-14 border-t border-slate-200 pt-10"
      >
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-emerald-700">
              Customer feedback
            </p>
            <h2
              id="reviews-heading"
              className="mt-2 text-2xl font-bold text-slate-950"
            >
              Product reviews
            </h2>
          </div>
          <p className="text-sm text-slate-600">
            {product.averageRating === null
              ? "No rating yet"
              : `${product.averageRating.toFixed(1)} / 5 from ${product.reviewCount} ${product.reviewCount === 1 ? "review" : "reviews"}`}
          </p>
        </div>

        <div className="mt-7 grid gap-8 lg:grid-cols-[minmax(0,1fr)_23rem] lg:items-start">
          <PublicReviewList data={reviewData} />
          <ReviewManagement
            data={reviewData}
            productId={product.id}
            returnPath={productHref}
          />
        </div>
      </section>
    </article>
  );
}

type ReviewData = {
  reviews?: PublicReview[];
  publicError?: string;
  authenticated: boolean;
  myReview: MyReview | null;
  managementError?: string;
};

function PublicReviewList({ data }: { data: ReviewData }) {
  if (data.publicError) {
    return (
      <FeedbackState
        title="Reviews unavailable"
        description={data.publicError}
      />
    );
  }
  if (!data.reviews?.length) {
    return (
      <FeedbackState
        title="No reviews yet"
        description="Customers with a delivered purchase can be the first to review this product."
      />
    );
  }
  return (
    <div className="space-y-4">
      {data.reviews.map((review) => (
        <article
          key={review.id}
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p
              className="font-bold text-amber-700"
              aria-label={`${review.rating} out of 5 stars`}
            >
              {"★".repeat(review.rating)}
              <span className="text-slate-300">
                {"★".repeat(5 - review.rating)}
              </span>
            </p>
            <time
              dateTime={review.createdAt}
              className="text-sm text-slate-500"
            >
              {formatReviewDate(review.createdAt)}
            </time>
          </div>
          {review.title && (
            <h3 className="mt-3 text-lg font-bold text-slate-950">
              {review.title}
            </h3>
          )}
          {review.body && (
            <p className="mt-3 whitespace-pre-wrap leading-7 text-slate-600">
              {review.body}
            </p>
          )}
          {!review.title && !review.body && (
            <p className="mt-3 text-sm text-slate-500">Rating only</p>
          )}
          {review.updatedAt !== review.createdAt && (
            <p className="mt-3 text-xs text-slate-400">
              Updated {formatReviewDate(review.updatedAt)}
            </p>
          )}
        </article>
      ))}
    </div>
  );
}

function ReviewManagement({
  data,
  productId,
  returnPath,
}: {
  data: ReviewData;
  productId: number;
  returnPath: string;
}) {
  if (data.managementError) {
    return (
      <FeedbackState
        title="Review tools unavailable"
        description={data.managementError}
      />
    );
  }
  if (!data.authenticated) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
        <h3 className="font-bold text-slate-950">Want to leave a review?</h3>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Sign in and the backend will check whether this product has a
          delivered purchase.
        </p>
        <Link
          href={buildLoginHref(returnPath)}
          className="mt-5 inline-flex min-h-11 items-center justify-center rounded-lg bg-emerald-800 px-4 py-2 font-semibold text-white hover:bg-emerald-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800"
        >
          Sign in to review
        </Link>
      </div>
    );
  }
  return (
    <ReviewManager
      key={`${data.myReview?.id ?? "new"}-${data.myReview?.updatedAt ?? ""}`}
      productId={productId}
      returnPath={returnPath}
      review={data.myReview}
    />
  );
}

async function loadReviews(productId: number): Promise<ReviewData> {
  const [publicResult, mineResult] = await Promise.allSettled([
    getPublicReviews(productId),
    getMyReview(productId),
  ]);
  const data: ReviewData = {
    authenticated: false,
    myReview: null,
  };

  if (publicResult.status === "fulfilled") data.reviews = publicResult.value;
  else data.publicError = apiErrorMessage(publicResult.reason);

  if (mineResult.status === "fulfilled") {
    data.authenticated = true;
    data.myReview = mineResult.value;
  } else if (
    mineResult.reason instanceof ApiError &&
    mineResult.reason.status === 404
  ) {
    data.authenticated = true;
  } else if (
    !(mineResult.reason instanceof ApiError) ||
    mineResult.reason.status !== 401
  ) {
    data.managementError = apiErrorMessage(mineResult.reason);
  }
  return data;
}

function formatReviewDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date unavailable";
  return new Intl.DateTimeFormat("en", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

async function loadProduct(
  slug: string,
): Promise<{ data: ProductDetail } | { notFound: true } | { error: string }> {
  try {
    return { data: await getProductBySlug(slug) };
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return { notFound: true };
    }
    return { error: apiErrorMessage(error) };
  }
}
