import Link from "next/link";
import { formatPriceRange } from "@/lib/money";
import type { ProductSummary } from "@/types/catalog";
import { ProductMedia } from "./product-media";

export function ProductCard({ product }: { product: ProductSummary }) {
  return (
    <article className="group overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <Link
        href={`/products/${product.slug}`}
        className="block focus-visible:outline-2 focus-visible:outline-emerald-800"
        aria-label={`View ${product.name}`}
      >
        <div className="relative aspect-[4/3] overflow-hidden">
          <ProductMedia image={product.images[0]} productName={product.name} />
        </div>
        <div className="p-5">
          <div className="flex items-start justify-between gap-3">
            <h2 className="font-semibold text-slate-900 group-hover:text-emerald-800">
              {product.name}
            </h2>
            <span
              className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${
                product.inStock
                  ? "bg-emerald-100 text-emerald-800"
                  : "bg-slate-100 text-slate-600"
              }`}
            >
              {product.inStock ? "In stock" : "Out of stock"}
            </span>
          </div>
          <p className="mt-3 font-bold text-emerald-900">
            {formatPriceRange(product.minPrice, product.maxPrice)}
          </p>
          <p className="mt-3 text-sm text-slate-500">
            {product.averageRating === null
              ? "No reviews yet"
              : `★ ${product.averageRating.toFixed(1)} · ${product.reviewCount} ${
                  product.reviewCount === 1 ? "review" : "reviews"
                }`}
          </p>
        </div>
      </Link>
    </article>
  );
}
