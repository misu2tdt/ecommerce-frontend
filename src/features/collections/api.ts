import { apiFetch, apiFetchPage } from "@/lib/api";
import {
  COLLECTIONS_PAGE_SIZE,
  type PaginationInfo,
} from "@/lib/pagination";
import { buildProductsQuery, getProductsPage } from "@/features/catalog/api";
import type { ProductSummary } from "@/types/catalog";
import type { Collection } from "@/types/collections";
import type { CollectionSort } from "./search-params";

// Public collection requests. A collection is listed only when it is active and
// holds at least one product a shopper can buy; the backend decides that.

// How long the "is there any collection?" answer for the navigation is kept, so
// the menus do not add a backend call to every page view.
export const COLLECTIONS_NAV_REVALIDATE_SECONDS = 300;
export const COLLECTIONS_NAV_TAG = "collections-nav";

// One page of the collection grid, with the totals for the pager.
export function getCollectionsPage(
  page: number,
): Promise<{ items: Collection[] } & PaginationInfo> {
  return apiFetchPage<Collection>(
    "/collections",
    {},
    { page, limit: COLLECTIONS_PAGE_SIZE },
  );
}

// Every collection, unpaged (the home page picks the featured one).
export function getCollections(): Promise<Collection[]> {
  return apiFetch<Collection[]>("/collections");
}

export function getCollectionBySlug(slug: string): Promise<Collection> {
  return apiFetch<Collection>(`/collections/${encodeURIComponent(slug)}`);
}

// One page of a collection's products (12), in the collection's own order unless
// a sort is given.
export function getCollectionProductsPage(
  slug: string,
  sort: CollectionSort | undefined,
  page: number,
): Promise<{ items: ProductSummary[] } & PaginationInfo> {
  return getProductsPage({ collection: slug, sort }, page);
}

// The first products of a collection, in its own order (the home page shows up to 8).
export async function getCollectionProducts(
  slug: string,
  limit: number,
): Promise<ProductSummary[]> {
  const { items } = await apiFetchPage<ProductSummary>(
    "/products",
    { query: buildProductsQuery({ collection: slug }) },
    { page: 1, limit },
  );
  return items;
}

// Every collection page address, by asking for the list page by page (100 at a
// time, the most the backend gives). Used by the sitemap.
export async function getAllCollectionSlugs(): Promise<Array<{ slug: string }>> {
  const slugs: Array<{ slug: string }> = [];
  let totalPages = 1;
  for (let page = 1; page <= totalPages; page += 1) {
    const result = await apiFetchPage<Collection>(
      "/collections",
      {},
      { page, limit: 100 },
    );
    totalPages = result.totalPages;
    slugs.push(...result.items.map(({ slug }) => ({ slug })));
  }
  return slugs;
}

// A single active collection is enough to show the "Collections" menu entry, so
// this asks for one row and keeps the answer for a few minutes.
export function getNavCollections(): Promise<Collection[]> {
  return apiFetch<Collection[]>("/collections", {
    query: { page: 1, limit: 1 },
    next: {
      revalidate: COLLECTIONS_NAV_REVALIDATE_SECONDS,
      tags: [COLLECTIONS_NAV_TAG],
    },
  });
}
