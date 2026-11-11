import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CollectionForm } from "@/components/collection-form";
import { CollectionProductPicker } from "@/components/collection-product-picker";
import { CollectionToggleButton } from "@/components/collection-toggle-button";
import { FeedbackState } from "@/components/feedback-state";
import { Badge } from "@/components/ui/badge";
import { buttonStyles } from "@/components/ui/button";
import { getAdminProducts } from "@/features/admin/api";
import { adminGetCollection } from "@/features/collections/admin-api";
import { collectionPath } from "@/features/collections/search-params";
import { ApiError, apiErrorMessage } from "@/lib/api";

export const metadata: Metadata = { title: "Manage Collection" };

export default async function ManageCollectionPage({
  params,
  searchParams,
}: {
  params: Promise<{ collectionId: string }>;
  searchParams: Promise<{ created?: string }>;
}) {
  const rawId = (await params).collectionId;
  if (!/^[1-9]\d*$/.test(rawId)) notFound();
  const justCreated = (await searchParams).created === "1";

  let data;
  try {
    const [collection, products] = await Promise.all([
      adminGetCollection(Number(rawId)),
      getAdminProducts(),
    ]);
    data = { collection, products };
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    return <FeedbackState title="Collection unavailable" description={apiErrorMessage(error)} />;
  }
  const { collection } = data;

  // Only what the picker needs from each product.
  const catalog = data.products.map((product) => ({
    id: product.id,
    name: product.name,
    slug: product.slug,
    status: product.status,
    categoryName: product.category.name,
    brandName: product.brand?.name ?? null,
  }));

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <Link
            href="/admin/collections"
            className="font-semibold text-brand underline focus-visible:outline-2 focus-visible:outline-brand"
          >
            &larr; Collections
          </Link>
          <h2 className="mt-4 break-words text-heading font-bold text-brand-strong">
            {collection.name}
          </h2>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Badge
              variant={collection.isActive ? "success" : "neutral"}
              className="uppercase"
            >
              {collection.isActive ? "Active" : "Inactive"}
            </Badge>
            {collection.isFeatured && (
              <Badge variant="warning" className="uppercase">
                Featured
              </Badge>
            )}
            <span className="text-body-sm text-neutral-600">
              {collection.visibleProductCount} of {collection.productCount}{" "}
              {collection.productCount === 1 ? "product" : "products"} shown to shoppers
            </span>
          </div>
        </div>
        <div className="flex flex-wrap items-start gap-3">
          {collection.isActive && collection.visibleProductCount > 0 && (
            <Link
              href={collectionPath(collection.slug)}
              className={buttonStyles({ variant: "secondary", size: "md" })}
            >
              View storefront
            </Link>
          )}
          <CollectionToggleButton
            id={collection.id}
            name={collection.name}
            isActive={collection.isActive}
          />
        </div>
      </div>

      {justCreated && (
        <p
          role="status"
          className="mt-6 rounded-md border border-success/30 bg-success-soft px-4 py-3 text-body-sm text-success"
        >
          Collection created. Now choose its products below.
        </p>
      )}

      <section className="mt-8 rounded-md border border-line bg-surface p-6 sm:p-8">
        <h3 className="text-heading font-bold text-brand-strong">Details</h3>
        <div className="mt-6">
          <CollectionForm collection={collection} />
        </div>
      </section>

      <section className="mt-8 rounded-md border border-line bg-surface p-6 sm:p-8">
        <h3 className="text-heading font-bold text-brand-strong">Products</h3>
        <p className="mt-2 text-neutral-600">
          Choose the products and put them in the order shoppers will see them.
        </p>
        <div className="mt-6">
          <CollectionProductPicker
            collectionId={collection.id}
            catalog={catalog}
            initialIds={collection.products.map((product) => product.id)}
          />
        </div>
      </section>
    </>
  );
}
