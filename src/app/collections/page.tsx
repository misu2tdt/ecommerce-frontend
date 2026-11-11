import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CollectionCard } from "@/components/collection-card";
import { FeedbackState } from "@/components/feedback-state";
import { ListPager } from "@/components/list-pager";
import { Eyebrow } from "@/components/ui/eyebrow";
import type { CatalogSearchParams } from "@/features/catalog/search-params";
import { getCollectionsPage } from "@/features/collections/api";
import { buildCollectionsHref } from "@/features/collections/search-params";
import { pageRedirectTarget, parsePageParam } from "@/lib/pagination";
import { collectionsIndexMetadata } from "@/lib/seo";

// Title, description and canonical address follow the page of the address.
export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<CatalogSearchParams>;
}): Promise<Metadata> {
  return collectionsIndexMetadata(parsePageParam((await searchParams).page).page);
}

export default async function CollectionsPage({
  searchParams,
}: {
  searchParams: Promise<CatalogSearchParams>;
}) {
  const pageParam = parsePageParam((await searchParams).page);
  let result;
  try {
    result = await getCollectionsPage(pageParam.page);
  } catch {
    return (
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <FeedbackState
          as="h1"
          title="Collections temporarily unavailable"
          description="Collections are temporarily unavailable. Please try again shortly."
          actionHref="/collections"
          actionLabel="Try again"
        />
      </section>
    );
  }

  // An unusable page (not a number, or past the last page) goes to a real one.
  const redirectPage = pageRedirectTarget(pageParam, result.totalPages);
  if (redirectPage !== null) redirect(buildCollectionsHref(redirectPage));

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="border-b border-line pb-6">
        <Eyebrow>Shop</Eyebrow>
        <h1 className="mt-1 font-bold tracking-tight text-brand text-display">
          Collections
        </h1>
        <p className="mt-2 max-w-3xl text-body-sm text-neutral-600">
          Hand-picked groups of pieces that belong together, from everyday
          basics to layers for cooler days.
        </p>
      </div>

      {result.items.length === 0 ? (
        <div className="py-12">
          <FeedbackState
            title="No collections yet"
            description="There are no collections to show right now. In the meantime, browse everything we have."
            actionHref="/products"
            actionLabel="Browse all products"
          />
        </div>
      ) : (
        <>
          <ul className="mt-8 grid gap-x-4 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
            {result.items.map((collection, index) => (
              <li key={collection.id} className="min-w-0">
                <CollectionCard collection={collection} priority={index < 3} />
              </li>
            ))}
          </ul>
          <ListPager
            path="/collections"
            page={pageParam.page}
            totalPages={result.totalPages}
            total={result.total}
            limit={result.limit}
            label="Collections pages"
          />
        </>
      )}
    </div>
  );
}
