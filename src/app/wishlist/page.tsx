import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { FeedbackState } from "@/components/feedback-state";
import { WishlistRemoveControl } from "@/components/wishlist-remove-control";
import { buildLoginHref } from "@/features/auth/redirects";
import { getWishlist } from "@/features/wishlist/api";
import { ApiError, apiErrorMessage } from "@/lib/api";
import { formatPriceRange } from "@/lib/money";
import type { WishlistItem } from "@/types/wishlist";

import { Eyebrow } from "@/components/ui/eyebrow";
import { SITE_NAME } from "@/lib/site";
import { Badge } from "@/components/ui/badge";
export const metadata: Metadata = {
  title: "Wishlist",
  description: `Products saved to your ${SITE_NAME} wishlist.`,
};

export default async function WishlistPage() {
  const result = await loadWishlist();
  if ("unauthenticated" in result) redirect(buildLoginHref("/wishlist"));
  if ("error" in result) {
    return (
      <section className="mx-auto max-w-6xl px-6 py-16">
        <FeedbackState
          title="Wishlist unavailable"
          description={apiErrorMessage(result.error)}
        />
      </section>
    );
  }

  const items = result.data;
  return (
    <section className="mx-auto max-w-6xl px-6 py-10 sm:py-14">
      <div className="mb-8">
        <Eyebrow>
          Saved products
        </Eyebrow>
        <h1 className="mt-2 font-bold tracking-tight text-brand-strong text-display">
          Your wishlist
        </h1>
        <p className="mt-3 text-neutral-600">
          Prices, ratings, and availability reflect the current catalog.
        </p>
      </div>

      {items.length === 0 ? (
        <FeedbackState
          title="Your wishlist is empty"
          description="Save products from the catalog to find them here later."
          actionHref="/products"
          actionLabel="Browse products"
        />
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <WishlistCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </section>
  );
}

function WishlistCard({ item }: { item: WishlistItem }) {
  const { product } = item;
  const href = `/products/${encodeURIComponent(product.slug)}`;
  const purchasable = product.available && product.inStock;
  return (
    <article className="overflow-hidden rounded-md border border-line bg-surface">
      <Link
        href={href}
        className="relative block aspect-[4/3] overflow-hidden bg-brand-soft focus-visible:outline-2 focus-visible:outline-brand"
        aria-label={`View ${product.name}`}
      >
        {product.primaryImage ? (
          <Image
            src={product.primaryImage.url}
            alt={product.primaryImage.altText || product.name}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className="object-cover"
          />
        ) : (
          <span className="flex h-full items-center justify-center text-body-sm text-neutral-600">
            No image available
          </span>
        )}
      </Link>
      <div className="p-5">
        <Eyebrow>
          {product.category.name}
          {product.brand ? ` / ${product.brand.name}` : ""}
        </Eyebrow>
        <div className="mt-2 flex min-w-0 items-start justify-between gap-3">
          <Link
            href={href}
            className="min-w-0 break-words font-bold text-brand-strong hover:text-brand focus-visible:outline-2 focus-visible:outline-brand"
          >
            {product.name}
          </Link>
          <Badge
            variant={purchasable ? "success" : "neutral"}
            size="md"
            className="shrink-0"
          >
            {purchasable
              ? "In stock"
              : product.available
                ? "Out of stock"
                : "Unavailable"}
          </Badge>
        </div>
        <p className="mt-3 font-bold text-brand-strong">
          {formatPriceRange(product.minPrice, product.maxPrice)}
        </p>
        <p className="mt-2 text-body-sm text-neutral-600">
          {product.averageRating === null
            ? "No reviews yet"
            : `${product.averageRating.toFixed(1)} / 5 · ${product.reviewCount} ${product.reviewCount === 1 ? "review" : "reviews"}`}
        </p>
        <div className="mt-5 flex items-start justify-between gap-3 border-t border-line pt-4">
          <Link
            href={href}
            className="inline-flex min-h-11 items-center rounded-md px-2 text-body-sm font-semibold text-brand hover:text-brand-strong focus-visible:outline-2 focus-visible:outline-brand"
          >
            View product
          </Link>
          <WishlistRemoveControl productId={product.id} />
        </div>
      </div>
    </article>
  );
}

async function loadWishlist(): Promise<
  { data: WishlistItem[] } | { unauthenticated: true } | { error: unknown }
> {
  try {
    return { data: await getWishlist() };
  } catch (error) {
    if (error instanceof ApiError && error.status === 401)
      return { unauthenticated: true };
    return { error };
  }
}
