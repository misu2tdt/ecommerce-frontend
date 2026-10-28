import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { FeedbackState } from "@/components/feedback-state";
import { ProductCard } from "@/components/product-card";
import { ProductGrid } from "@/components/product-grid";
import { WishlistRemoveControl } from "@/components/wishlist-remove-control";
import { buildLoginHref } from "@/features/auth/redirects";
import { getWishlist } from "@/features/wishlist/api";
import { ApiError, apiErrorMessage } from "@/lib/api";
import type { WishlistItem } from "@/types/wishlist";

import { Eyebrow } from "@/components/ui/eyebrow";
import { SITE_NAME } from "@/lib/site";
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
        <ProductGrid>
          {items.map((item) => (
            <ProductCard
              key={item.id}
              product={item.product}
              headingLevel="h2"
              action={null}
              footer={<WishlistRemoveControl productId={item.product.id} />}
            />
          ))}
        </ProductGrid>
      )}
    </section>
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
