import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CollectionToggleButton } from "@/components/collection-toggle-button";
import { FeedbackState } from "@/components/feedback-state";
import { ListPager } from "@/components/list-pager";
import { Badge } from "@/components/ui/badge";
import { buttonStyles } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/eyebrow";
import type { CatalogSearchParams } from "@/features/catalog/search-params";
import { adminGetCollectionsPage } from "@/features/collections/admin-api";
import { apiErrorMessage } from "@/lib/api";
import { pageRedirectTarget, parsePageParam, withPage } from "@/lib/pagination";

export const metadata: Metadata = { title: "Admin Collections" };

export default async function AdminCollectionsPage({
  searchParams,
}: {
  searchParams: Promise<CatalogSearchParams>;
}) {
  const pageParam = parsePageParam((await searchParams).page);
  let result;
  try {
    result = await adminGetCollectionsPage(pageParam.page);
  } catch (error) {
    return (
      <FeedbackState
        title="Collections unavailable"
        description={apiErrorMessage(error)}
        actionHref="/admin/collections"
        actionLabel="Try again"
      />
    );
  }
  const redirectPage = pageRedirectTarget(pageParam, result.totalPages);
  if (redirectPage !== null) redirect(withPage("/admin/collections", "", redirectPage));

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Eyebrow>Catalog</Eyebrow>
          <h2 className="mt-2 text-heading font-bold text-brand-strong">Collections</h2>
          <p className="mt-3 text-neutral-600">
            Curated, ordered groups of products. Shoppers see an active collection once it holds a product they can buy.
          </p>
        </div>
        <Link
          href="/admin/collections/new"
          className={buttonStyles({ variant: "primary", size: "md" })}
        >
          Create collection
        </Link>
      </div>

      {result.items.length === 0 ? (
        <div className="mt-8 rounded-md border border-dashed border-field-border bg-surface p-10 text-center text-neutral-600">
          No collections yet.
        </div>
      ) : (
        <div className="mt-8 overflow-hidden rounded-md border border-line bg-surface">
          {/* `relative`: the screen-reader-only header below is absolutely positioned
              and must be clipped by this scroll box, not widen the whole page. */}
          <div className="relative overflow-x-auto">
            <table className="min-w-full divide-y divide-line">
              <thead className="bg-surface-muted">
                <tr>
                  {["Collection", "Status", "Sort order", "Products", ""].map((heading, index) => (
                    <th
                      key={index}
                      scope="col"
                      className="px-5 py-3 text-left uppercase text-neutral-600 text-caption font-semibold tracking-eyebrow"
                    >
                      {heading || <span className="sr-only">Actions</span>}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {result.items.map((collection) => (
                  <tr key={collection.id}>
                    <td className="px-5 py-4">
                      <p className="break-words font-bold text-brand-strong">{collection.name}</p>
                      <p className="mt-1 break-all text-body-sm text-neutral-600">/{collection.slug}</p>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex flex-wrap gap-2">
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
                      </div>
                    </td>
                    <td className="px-5 py-4 text-body-sm text-neutral-700">{collection.sortOrder}</td>
                    <td className="px-5 py-4 text-body-sm text-neutral-700">
                      {collection.productCount}
                      {collection.visibleProductCount !== collection.productCount && (
                        <span className="block text-neutral-600">
                          {collection.visibleProductCount} shown to shoppers
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex flex-wrap items-start justify-end gap-3">
                        <Link
                          href={`/admin/collections/${collection.id}`}
                          aria-label={`Edit ${collection.name}`}
                          className={buttonStyles({ variant: "secondary", size: "md" })}
                        >
                          Edit
                        </Link>
                        <CollectionToggleButton
                          id={collection.id}
                          name={collection.name}
                          isActive={collection.isActive}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      <ListPager
        path="/admin/collections"
        page={pageParam.page}
        totalPages={result.totalPages}
        total={result.total}
        limit={result.limit}
        label="Collections pages"
      />
    </>
  );
}
