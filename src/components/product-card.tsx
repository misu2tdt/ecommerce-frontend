import Link from "next/link";
import type { ReactNode } from "react";
import type { ProductFilters } from "@/features/catalog/api";
import { buildProductDetailHref } from "@/features/catalog/search-params";
import { formatVnd } from "@/lib/money";
import { getProductCardPrice } from "@/lib/product-price";
import type { ProductSummary } from "@/types/catalog";
import type { WishlistItem } from "@/types/wishlist";
import { ProductMedia } from "./product-media";
import { Badge } from "./ui/badge";
import { cx } from "./ui/cx";
import { WishlistSaveControl } from "./wishlist-save-control";

// Matches the grid in ProductGrid: 2 columns on phones, 4 on wide screens.
const IMAGE_SIZES = "(max-width: 640px) 50vw, (max-width: 1280px) 33vw, 25vw";

interface ProductCardProps {
  // A catalog summary, or the product inside a wishlist item.
  product: ProductSummary | WishlistItem["product"];
  filters?: ProductFilters;
  // Product names are headings: pass the level that follows the section's own.
  headingLevel?: "h2" | "h3" | "h4";
  // For the first row of cards that is visible without scrolling.
  priority?: boolean;
  // Replaces the wishlist heart on the image. Pass null to show none.
  action?: ReactNode;
  // Extra controls under the text; they stay clickable above the card link.
  footer?: ReactNode;
}

export function ProductCard({
  product,
  filters = {},
  headingLevel: Heading = "h3",
  priority,
  action,
  footer,
}: ProductCardProps) {
  const productHref = buildProductDetailHref(product.slug, filters);
  const image =
    "primaryImage" in product ? product.primaryImage : product.images[0];
  const unavailable = "available" in product && !product.available;
  const price = getProductCardPrice({
    minPrice: product.minPrice,
    maxPrice: product.maxPrice,
    ...("minCompareAtPrice" in product
      ? {
          minCompareAtPrice: product.minCompareAtPrice,
          maxCompareAtPrice: product.maxCompareAtPrice,
        }
      : {}),
  });
  const hasReviews = product.averageRating !== null && product.reviewCount > 0;

  return (
    <article className="group relative">
      <div className="relative aspect-[4/5] overflow-hidden rounded-md bg-surface-muted">
        <ProductMedia
          image={image ?? undefined}
          productName={product.name}
          priority={priority}
          sizes={IMAGE_SIZES}
          decorative
          imageClassName="transition-transform duration-300 group-hover:scale-105"
        />
        {(unavailable || !product.inStock) && (
          <Badge variant="neutral" className="absolute left-2 top-2">
            {unavailable ? "Unavailable" : "Sold out"}
          </Badge>
        )}
        {action !== null && (
          <div className="absolute right-0.5 top-0.5 z-10">
            {action ?? (
              <WishlistSaveControl
                productId={product.id}
                productName={product.name}
                returnPath={productHref}
                compact
              />
            )}
          </div>
        )}
      </div>

      <div className="mt-3 flex min-w-0 flex-col gap-1">
        {/* 14px, not caption: 26 labels in 12px drop the catalog under the 95% readable-text guard. */}
        <p className="truncate text-body-sm text-neutral-600">
          {product.category.name}
          {product.brand ? ` / ${product.brand.name}` : ""}
        </p>
        <Heading className="line-clamp-2 break-words text-body-sm font-semibold text-brand-strong">
          {/* The one link of the card; its ::after stretches over the whole card. */}
          <Link
            href={productHref}
            className="after:absolute after:inset-0 focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-offset-2 focus-visible:after:outline-brand"
          >
            {product.name}
          </Link>
        </Heading>

        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
          {price ? (
            <>
              <span
                className={cx(
                  "text-body-sm font-semibold",
                  price.discountPercent ? "text-sale" : "text-brand-strong",
                )}
              >
                {price.isRange ? "From " : ""}
                {formatVnd(price.amount)}
              </span>
              {price.compareAt !== null && (
                <>
                  <span className="sr-only">Original price</span>
                  <span className="text-body-sm text-neutral-600 line-through">
                    {formatVnd(price.compareAt)}
                  </span>
                </>
              )}
              {price.discountPercent !== null && (
                <Badge variant="sale">-{price.discountPercent}%</Badge>
              )}
            </>
          ) : (
            <span className="text-body-sm text-neutral-600">
              Price unavailable
            </span>
          )}
        </div>

        {hasReviews && (
          <p className="flex items-center gap-1 text-body-sm text-neutral-600">
            <span aria-hidden="true" className="tracking-tight text-amber-700">
              {"★".repeat(Math.round(product.averageRating!))}
              <span className="text-neutral-300">
                {"★".repeat(5 - Math.round(product.averageRating!))}
              </span>
            </span>
            <span aria-hidden="true">({product.reviewCount})</span>
            <span className="sr-only">
              Rated {product.averageRating!.toFixed(1)} out of 5,{" "}
              {product.reviewCount}{" "}
              {product.reviewCount === 1 ? "review" : "reviews"}
            </span>
          </p>
        )}
      </div>

      {footer && <div className="relative z-10 mt-3">{footer}</div>}
    </article>
  );
}
