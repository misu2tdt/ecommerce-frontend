import Link from "next/link";
import type { ProductFilters } from "@/features/catalog/api";
import { buildProductDetailHref } from "@/features/catalog/search-params";
import { formatPriceRange } from "@/lib/money";
import type { ProductSummary } from "@/types/catalog";
import { ProductMedia } from "./product-media";
import { WishlistSaveControl } from "./wishlist-save-control";

import { Badge } from "@/components/ui/badge";
interface ProductCardProps {
  product: ProductSummary;
  filters?: ProductFilters;
}

export function ProductCard({ product, filters = {} }: ProductCardProps) {
  const productHref = buildProductDetailHref(product.slug, filters);
  return (
    <article className="group relative overflow-hidden rounded-md border border-line bg-surface transition hover:-translate-y-0.5">
      <div className="absolute right-3 top-3 z-10">
        <WishlistSaveControl
          productId={product.id}
          productName={product.name}
          returnPath={productHref}
          compact
        />
      </div>
      <Link
        href={productHref}
        className="block focus-visible:outline-2 focus-visible:outline-brand"
        aria-label={`View ${product.name}`}
      >
        <div className="relative aspect-[4/3] overflow-hidden">
          <ProductMedia image={product.images[0]} productName={product.name} />
        </div>
      </Link>
      <div className="p-5">
        <p className="mb-2 text-body-sm text-neutral-600">
          {product.category.name}
          {product.brand ? ` / ${product.brand.name}` : ""}
        </p>
        <div className="flex min-w-0 items-start justify-between gap-3">
          <h2 className="min-w-0 break-words font-semibold text-brand">
            <Link
              href={productHref}
              className="focus-visible:outline-2 focus-visible:outline-brand"
            >
              {product.name}
            </Link>
          </h2>
          <Badge variant={product.inStock ? "success" : "neutral"} size="md" className="shrink-0">
            {product.inStock ? "In stock" : "Out of stock"}
          </Badge>
        </div>
        <div className="mt-3 flex flex-wrap items-baseline gap-2">
          <span
            className={`font-bold ${product.hasDiscount ? "text-sale" : "text-brand-strong"}`}
          >
            {formatPriceRange(product.minPrice, product.maxPrice)}
          </span>
          {product.hasDiscount && <Badge variant="sale" size="md">Sale options</Badge>}
        </div>
        <p className="mt-3 text-body-sm text-neutral-600">
          {product.averageRating === null
            ? "No reviews yet"
            : `Rating ${product.averageRating.toFixed(1)} / 5 - ${product.reviewCount} ${
                product.reviewCount === 1 ? "review" : "reviews"
              }`}
        </p>
      </div>
    </article>
  );
}
