import "server-only";

import { authenticatedApiFetch } from "@/features/auth/api";
import type { Cart } from "@/types/cart";

export function getCart(): Promise<Cart> {
  return authenticatedApiFetch<Cart>("/cart");
}

export function addCartItem(variantId: number, quantity: number): Promise<Cart> {
  return authenticatedApiFetch<Cart>("/cart/items", {
    method: "POST",
    body: { variantId, quantity },
  });
}

export function updateCartItem(itemId: number, quantity: number): Promise<Cart> {
  return authenticatedApiFetch<Cart>(`/cart/items/${itemId}`, {
    method: "PATCH",
    body: { quantity },
  });
}

export function removeCartItem(itemId: number): Promise<Cart> {
  return authenticatedApiFetch<Cart>(`/cart/items/${itemId}`, {
    method: "DELETE",
  });
}

export function clearCart(): Promise<Cart> {
  return authenticatedApiFetch<Cart>("/cart", { method: "DELETE" });
}
