import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FeedbackState } from "@/components/feedback-state";
import { ProductMedia } from "@/components/product-media";
import { getProductBySlug } from "@/features/catalog/api";
import { ApiError, apiErrorMessage } from "@/lib/api";
import { formatPriceRange, formatVnd } from "@/lib/money";
import type { ProductDetail } from "@/types/catalog";

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
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const result = await loadProduct(slug);

  if ("notFound" in result) notFound();
  if ("error" in result) {
    return (
      <section className="mx-auto max-w-6xl px-6 py-16">
        <FeedbackState
          title="Product unavailable"
          description={result.error}
        />
      </section>
    );
  }

  const product = result.data;
  return (
      <article className="mx-auto max-w-6xl px-6 py-10 sm:py-14">
        <Link
          href="/products"
          className="text-sm font-semibold text-emerald-800 hover:text-emerald-950 focus-visible:outline-2 focus-visible:outline-emerald-800"
        >
          Back to products
        </Link>

        <div className="mt-7 grid gap-10 lg:grid-cols-2 lg:items-start">
          <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <ProductMedia
              image={product.images[0]}
              productName={product.name}
              priority
            />
          </div>

          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-emerald-700">
              {product.category.name}
              {product.brand ? ` · ${product.brand.name}` : ""}
            </p>
            <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
              {product.name}
            </h1>
            <p className="mt-4 text-2xl font-bold text-emerald-900">
              {formatPriceRange(product.minPrice, product.maxPrice)}
            </p>
            <p className="mt-3 text-sm text-slate-500">
              {product.averageRating === null
                ? "No reviews yet"
                : `★ ${product.averageRating.toFixed(1)} from ${product.reviewCount} ${
                    product.reviewCount === 1 ? "review" : "reviews"
                  }`}
            </p>
            <p className="mt-6 leading-7 text-slate-600">
              {product.description ||
                "No description is available for this product."}
            </p>
          </div>
        </div>

        <section className="mt-14" aria-labelledby="variants-heading">
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-emerald-700">
            Inventory
          </p>
          <h2
            id="variants-heading"
            className="mt-2 text-2xl font-bold text-slate-950"
          >
            Available variants
          </h2>

          {product.variants.length === 0 ? (
            <p className="mt-6 rounded-xl border border-slate-200 bg-white p-6 text-slate-600">
              No active variants are available.
            </p>
          ) : (
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {product.variants.map((variant) => (
                <div
                  key={variant.id}
                  className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="font-semibold text-slate-900">
                        {variant.name}
                      </h3>
                      <p className="mt-1 text-xs uppercase tracking-wide text-slate-500">
                        SKU {variant.sku}
                      </p>
                    </div>
                    <span
                      className={`text-sm font-semibold ${
                        variant.stock > 0
                          ? "text-emerald-700"
                          : "text-slate-500"
                      }`}
                    >
                      {variant.stock > 0
                        ? `${variant.stock} in stock`
                        : "Out of stock"}
                    </span>
                  </div>
                  <p className="mt-5 text-lg font-bold text-emerald-900">
                    {formatVnd(variant.price)}
                  </p>
                  {Object.keys(variant.attributes).length > 0 && (
                    <dl className="mt-4 flex flex-wrap gap-2">
                      {Object.entries(variant.attributes).map(([key, value]) => (
                        <div
                          key={key}
                          className="rounded bg-slate-100 px-2.5 py-1 text-xs text-slate-600"
                        >
                          <dt className="sr-only">{key}</dt>
                          <dd>{value}</dd>
                        </div>
                      ))}
                    </dl>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </article>
  );
}

async function loadProduct(
  slug: string,
): Promise<
  | { data: ProductDetail }
  | { notFound: true }
  | { error: string }
> {
  try {
    return { data: await getProductBySlug(slug) };
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return { notFound: true };
    }
    return { error: apiErrorMessage(error) };
  }
}
