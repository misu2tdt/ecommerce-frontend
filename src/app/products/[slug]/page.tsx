import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FeedbackState } from "@/components/feedback-state";
import { ProductGallery } from "@/components/product-gallery";
import { ProductPurchasePanel } from "@/components/product-purchase-panel";
import { RelatedProducts } from "@/components/related-products";
import { ReviewManager } from "@/components/review-manager";
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

import { buttonStyles } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/eyebrow";
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  try {
    const product = await getProductBySlug(slug);
    return {
      title: `${product.name} | VERVE STUDIO`,
      description:
        product.description ||
        `Explore ${product.name} in our modern everyday fashion catalog.`,
    };
  } catch {
    return { title: slug.replaceAll("-", " ") };
  }
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
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <FeedbackState
          title="Product unavailable"
          description={result.error}
          actionHref="/products"
          actionLabel="Back to products"
        />
      </section>
    );
  }

  const product = result.data;

  // Load reviews concurrently
  const reviewData = await loadReviews(product.id);

  const hasReviews = product.reviewCount > 0 && product.averageRating !== null;

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 pb-28 sm:px-6 lg:px-8 lg:pb-12">
      {/* Breadcrumb Navigation */}
      <nav aria-label="Breadcrumb" className="mb-6">
        <ol className="flex flex-wrap items-center gap-2 text-body-sm font-normal text-neutral-600">
          <li>
            <Link
              href={backHref}
              className="transition hover:text-brand focus-visible:outline-2 focus-visible:outline-brand"
            >
              All Products
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li>
            <Link
              href={`/products?category=${product.category.slug}`}
              className="transition hover:text-brand focus-visible:outline-2 focus-visible:outline-brand"
            >
              {product.category.name}
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li
            className="max-w-[200px] truncate font-semibold text-neutral-800 sm:max-w-none"
            aria-current="page"
          >
            {product.name}
          </li>
        </ol>
      </nav>

      {/* Main PDP Grid */}
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(22rem,0.85fr)] lg:items-start lg:gap-14">
        {/* Left Column: Image Gallery V2 */}
        <div className="w-full">
          <ProductGallery images={product.images} productName={product.name} />
        </div>

        {/* Right Column: Product Info & Purchase Panel */}
        <div className="flex flex-col">
          {/* Brand & Category Header */}
          <div className="flex items-center gap-2">
            <span className="text-body-sm font-bold text-brand">
              {product.brand?.name || product.category.name}
            </span>
            {product.brand && (
              <>
                <span className="text-neutral-300">•</span>
                <span className="text-body-sm font-semibold text-neutral-600">
                  {product.category.name}
                </span>
              </>
            )}
          </div>

          {/* Product Name (H1) */}
          <h1 className="mt-2 font-bold tracking-tight text-brand-strong text-display">
            {product.name}
          </h1>

          {/* Rating Summary (Truthful: No filled stars for 0-review items) */}
          <div className="mt-3 flex items-center gap-3">
            {hasReviews ? (
              <>
                <div
                  role="img"
                  className="flex items-center text-body-sm text-amber-700"
                  aria-label={`Rating ${product.averageRating?.toFixed(1)} out of 5`}
                >
                  {"★".repeat(Math.round(product.averageRating!))}
                  <span className="text-neutral-300">
                    {"★".repeat(5 - Math.round(product.averageRating!))}
                  </span>
                </div>
                <span className="text-body-sm font-normal text-neutral-600">
                  {product.averageRating?.toFixed(1)} / 5 ({product.reviewCount}{" "}
                  {product.reviewCount === 1 ? "review" : "reviews"})
                </span>
              </>
            ) : (
              <span className="text-body-sm text-neutral-600">No reviews yet</span>
            )}
          </div>

          {/* Product Description */}
          {product.description ? (
            <p className="mt-4 text-body text-neutral-600">
              {product.description}
            </p>
          ) : (
            <p className="mt-4 text-body italic text-neutral-600">
              No description is available for this product.
            </p>
          )}

          {/* Interactive Purchase Panel V2 */}
          <div className="mt-6">
            <ProductPurchasePanel
              productId={product.id}
              productName={product.name}
              variants={product.variants}
              returnPath={productHref}
              categoryName={product.category.name}
              brandName={product.brand?.name}
              description={product.description}
              minPrice={product.minPrice}
              maxPrice={product.maxPrice}
            />
          </div>
        </div>
      </div>

      {/* Customer Reviews Section */}
      <section
        aria-labelledby="reviews-heading"
        className="mt-16 border-t border-line pt-12"
      >
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Eyebrow>
              Customer Feedback
            </Eyebrow>
            <h2
              id="reviews-heading"
              className="mt-1 text-heading font-bold tracking-tight text-brand-strong"
            >
              Product Reviews
            </h2>
          </div>
          <p className="text-body-sm text-neutral-600">
            {hasReviews
              ? `Overall ${product.averageRating?.toFixed(1)} / 5 based on ${product.reviewCount} ${
                  product.reviewCount === 1
                    ? "verified review"
                    : "verified reviews"
                }`
              : "Be the first to review"}
          </p>
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_23rem] lg:items-start">
          <PublicReviewList data={reviewData} />
          <ReviewManagement
            data={reviewData}
            productId={product.id}
            returnPath={productHref}
          />
        </div>
      </section>

      {/* Related Products Section */}
      <RelatedProducts
        currentProductId={product.id}
        categorySlug={product.category.slug}
        categoryName={product.category.name}
      />
    </div>
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
          className="rounded-md border border-line bg-surface p-5 sm:p-6"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p
              role="img"
              className="font-bold text-amber-700"
              aria-label={`${review.rating} out of 5 stars`}
            >
              {"★".repeat(review.rating)}
              <span className="text-neutral-300">
                {"★".repeat(5 - review.rating)}
              </span>
            </p>
            <time
              dateTime={review.createdAt}
              className="text-body-sm font-normal text-neutral-500"
            >
              {formatReviewDate(review.createdAt)}
            </time>
          </div>
          {review.title && (
            <h3 className="mt-3 text-body font-bold text-brand-strong sm:text-title">
              {review.title}
            </h3>
          )}
          {review.body && (
            <p className="mt-2 whitespace-pre-wrap text-body text-neutral-600">
              {review.body}
            </p>
          )}
          {!review.title && !review.body && (
            <p className="mt-2 text-body-sm italic text-neutral-500">Rating only</p>
          )}
          {review.updatedAt !== review.createdAt && (
            <p className="mt-3 text-body-sm text-neutral-500">
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
      <div className="rounded-md border border-line bg-surface-muted p-6">
        <h3 className="text-body font-bold text-brand-strong">
          Share Your Experience
        </h3>
        <p className="mt-2 text-body text-neutral-600">
          Sign in to submit a verified product review after receiving your
          delivery.
        </p>
        <Link
          href={buildLoginHref(returnPath)}
          className={buttonStyles({ variant: "primary", size: "md", className: "mt-5" })}
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
