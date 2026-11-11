import { VALID_SORTS } from "@/features/catalog/search-params";
import { withPage } from "@/lib/pagination";
import type { ProductSort } from "@/types/catalog";

// The sorts a collection page offers. "featured" is left out on purpose: in a
// collection the default order is the collection's own (the order an admin set),
// and sending sort=featured would replace it with plain name order.
export type CollectionSort = Exclude<ProductSort, "featured">;

export function parseCollectionSort(
  value: string | string[] | undefined,
): CollectionSort | undefined {
  const candidate = (Array.isArray(value) ? value[0] : value)?.trim();
  return candidate &&
    candidate !== "featured" &&
    VALID_SORTS.includes(candidate as ProductSort)
    ? (candidate as CollectionSort)
    : undefined;
}

export function collectionPath(slug: string): string {
  return `/collections/${encodeURIComponent(slug)}`;
}

// The address of a collection page. Page 1 has no `page` parameter, so the
// first page has one address; the sort stays in the query.
export function buildCollectionHref(
  slug: string,
  sort: CollectionSort | undefined,
  page = 1,
): string {
  return withPage(collectionPath(slug), sort ? `sort=${sort}` : "", page);
}

// The address of the list of collections.
export function buildCollectionsHref(page = 1): string {
  return withPage("/collections", "", page);
}
