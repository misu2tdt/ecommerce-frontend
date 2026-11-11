import "server-only";

import {
  authenticatedApiFetch,
  authenticatedApiFetchPage,
} from "@/features/auth/api";
import type {
  AdminCollection,
  AdminCollectionDetail,
  AdminCollectionProduct,
  CreateCollectionInput,
  UpdateCollectionInput,
} from "@/types/collections";

export function adminGetCollectionsPage(page: number) {
  return authenticatedApiFetchPage<AdminCollection>("/admin/collections", page);
}

export function adminGetCollection(id: number): Promise<AdminCollectionDetail> {
  return authenticatedApiFetch<AdminCollectionDetail>(`/admin/collections/${id}`);
}

export function adminCreateCollection(
  input: CreateCollectionInput,
): Promise<AdminCollection> {
  return authenticatedApiFetch<AdminCollection>("/admin/collections", {
    method: "POST",
    body: input,
  });
}

export function adminUpdateCollection(
  id: number,
  input: UpdateCollectionInput,
): Promise<AdminCollection> {
  return authenticatedApiFetch<AdminCollection>(`/admin/collections/${id}`, {
    method: "PATCH",
    body: input,
  });
}

export function adminToggleCollection(id: number): Promise<AdminCollection> {
  return authenticatedApiFetch<AdminCollection>(
    `/admin/collections/${id}/toggle`,
    { method: "PATCH" },
  );
}

// Replaces the whole membership; `productIds` is the new list in display order.
export function adminReplaceCollectionProducts(
  id: number,
  productIds: number[],
): Promise<AdminCollectionProduct[]> {
  return authenticatedApiFetch<AdminCollectionProduct[]>(
    `/admin/collections/${id}/products`,
    { method: "PUT", body: { productIds } },
  );
}
