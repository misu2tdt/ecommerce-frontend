import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FeedbackState } from "@/components/feedback-state";
import { ProductGallery } from "@/components/product-gallery";
import { ProductPurchasePanel } from "@/components/product-purchase-panel";
import { getProductBySlug } from "@/features/catalog/api";
import {
  buildCatalogHref,
  buildProductDetailHref,
  parseProductFilters,
  type CatalogSearchParams,
} from "@/features/catalog/search-params";
import { ApiError, apiErrorMessage } from "@/lib/api";
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

          <ProductPurchasePanel
            variants={product.variants}
            returnPath={productHref}
          />
        </div>
      </div>
    </article>
  );
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
