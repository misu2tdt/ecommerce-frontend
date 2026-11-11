import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { cache, Suspense } from "react";
import { CatalogSortSelect } from "@/components/catalog-sort-select";
import { CollectionCover } from "@/components/collection-cover";
import { FeedbackState } from "@/components/feedback-state";
import { PageFocus } from "@/components/page-focus";
import { Pagination } from "@/components/pagination";
import { ProductCard } from "@/components/product-card";
import { ProductGrid } from "@/components/product-grid";
import { Eyebrow } from "@/components/ui/eyebrow";
import type { CatalogSearchParams } from "@/features/catalog/search-params";
import {
  getCollectionBySlug,
  getCollectionProductsPage,
} from "@/features/collections/api";
import {
  buildCollectionHref,
  collectionPath,
  parseCollectionSort,
} from "@/features/collections/search-params";
import { ApiError } from "@/lib/api";
import {
  pageRange,
  pageRedirectTarget,
  parsePageParam,
  type PaginationInfo,
} from "@/lib/pagination";
import { collectionJsonLd, collectionMetadata, noIndex } from "@/lib/seo";
import type { ProductSummary } from "@/types/catalog";
import type { Collection } from "@/types/collections";

export const dynamic = "force-dynamic";

type CollectionResult =
  | { collection: Collection }
  | { notFound: true }
  | { error: true };

// The page and its metadata both need the collection: ask the backend once.
const loadCollection = cache(async (slug: string): Promise<CollectionResult> => {
  try {
    return { collection: await getCollectionBySlug(slug) };
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return { notFound: true };
    }
    return { error: true };
  }
});

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<CatalogSearchParams>;
}): Promise<Metadata> {
  const { slug } = await params;
  const query = await searchParams;
  const result = await loadCollection(slug);
  if (!("collection" in result)) {
    // An unknown, inactive or unavailable collection has no page worth listing.
    return {
      title: "error" in result ? "Collection unavailable" : "Collection not found",
      ...noIndex(),
    };
  }
  return collectionMetadata({
    collection: result.collection,
    sort: parseCollectionSort(query.sort),
    page: parsePageParam(query.page).page,
  });
}

export default async function CollectionPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<CatalogSearchParams>;
}) {
  const { slug } = await params;
  const query = await searchParams;
  const sort = parseCollectionSort(query.sort);
  const pageParam = parsePageParam(query.page);

  const result = await loadCollection(slug);
  if ("notFound" in result) notFound();
  if ("error" in result) return <Unavailable slug={slug} />;
  const { collection } = result;

  let products: ProductSummary[];
  let pagination: PaginationInfo;
  try {
    const page = await getCollectionProductsPage(slug, sort, pageParam.page);
    products = page.items;
    pagination = page;
  } catch {
    return <Unavailable slug={slug} />;
  }

  // An unusable page (not a number, or past the last page) goes to a real one.
  const redirectPage = pageRedirectTarget(pageParam, pagination.totalPages);
  if (redirectPage !== null) redirect(buildCollectionHref(slug, sort, redirectPage));

  const { from, to } = pageRange(pageParam.page, pagination.limit, pagination.total);
  const firstPosition = (pageParam.page - 1) * pagination.limit + 1;

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      {/* Machine-readable collection data for search engines: only real values. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: collectionJsonLd(collection, products, firstPosition),
        }}
      />

      <nav aria-label="Breadcrumb" className="mb-4">
        <ol className="flex flex-wrap items-center gap-2 text-body-sm font-normal text-neutral-600">
          <li>
            <Link
              href="/"
              className="inline-flex min-h-11 items-center transition hover:text-brand focus-visible:outline-2 focus-visible:outline-brand"
            >
              Home
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li>
            <Link
              href="/collections"
              className="inline-flex min-h-11 items-center transition hover:text-brand focus-visible:outline-2 focus-visible:outline-brand"
            >
              Collections
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li
            className="max-w-[200px] truncate font-semibold text-neutral-800 sm:max-w-none"
            aria-current="page"
          >
            {collection.name}
          </li>
        </ol>
      </nav>

      {/* Header: the cover picture (when there is one) above the title */}
      <header className="border-b border-line pb-6">
        {collection.heroImageUrl && (
          <div className="relative mb-6 aspect-[3/1] overflow-hidden rounded-md bg-surface-muted">
            <CollectionCover
              url={collection.heroImageUrl}
              priority
              sizes="(max-width: 1280px) 100vw, 1280px"
            />
          </div>
        )}
        <Eyebrow>{collection.isFeatured ? "Featured collection" : "Collection"}</Eyebrow>
        <h1 className="mt-1 break-words font-bold tracking-tight text-brand text-display">
          {collection.name}
        </h1>
        {collection.description && (
          <p className="mt-2 max-w-3xl break-words text-body-sm text-neutral-600">
            {collection.description}
          </p>
        )}
      </header>

      {/* Control bar */}
      <div className="mt-6 flex flex-col gap-4 border-b border-line pb-4 sm:flex-row sm:items-center sm:justify-between">
        <p
          className="text-body-sm font-semibold text-neutral-600"
          role="status"
          aria-live="polite"
        >
          {pagination.total === 0
            ? "No products"
            : pagination.totalPages > 1
              ? `Showing ${from}–${to} of ${pagination.total} products`
              : `Showing ${pagination.total} ${pagination.total === 1 ? "product" : "products"}`}
        </p>
        <CatalogSortSelect
          currentSort={sort}
          basePath={collectionPath(slug)}
        />
      </div>

      <div className="mt-6">
        {products.length === 0 ? (
          <div className="py-12">
            <FeedbackState
              title="No products in this collection yet"
              description="Check back soon, or browse everything we have."
              actionHref="/products"
              actionLabel="Browse all products"
            />
          </div>
        ) : (
          <>
            {/* Where focus goes after a page change (see PageFocus). */}
            <h2
              id="collection-results"
              tabIndex={-1}
              className="sr-only focus:outline-none"
            >
              Products in {collection.name}, page {pageParam.page} of{" "}
              {pagination.totalPages}
            </h2>
            <Suspense fallback={null}>
              <PageFocus targetId="collection-results" />
            </Suspense>
            <ProductGrid variant="home">
              {products.map((product, index) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  headingLevel="h3"
                  priority={index < 4}
                />
              ))}
            </ProductGrid>
            <Pagination
              page={pageParam.page}
              totalPages={pagination.totalPages}
              hrefFor={(page) => buildCollectionHref(slug, sort, page)}
              label="Collection pages"
            />
          </>
        )}
      </div>
    </div>
  );
}

function Unavailable({ slug }: { slug: string }) {
  return (
    <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <FeedbackState
        as="h1"
        title="Collection unavailable"
        description="This collection is temporarily unavailable. Please try again shortly."
        actionHref={collectionPath(slug)}
        actionLabel="Try again"
      />
    </section>
  );
}
