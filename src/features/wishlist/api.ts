import "server-only";

import { authenticatedApiFetch } from "@/features/auth/api";
import type { WishlistItem } from "@/types/wishlist";

export function getWishlist(): Promise<WishlistItem[]> {
  return authenticatedApiFetch<WishlistItem[]>("/wishlist");
}

export function addWishlistItem(productId: number): Promise<WishlistItem> {
  return authenticatedApiFetch<WishlistItem>("/wishlist/items", {
    method: "POST",
    body: { productId },
  });
}

export function removeWishlistItem(productId: number): Promise<void> {
  return authenticatedApiFetch<void>(`/wishlist/items/${productId}`, {
    method: "DELETE",
  });
}
