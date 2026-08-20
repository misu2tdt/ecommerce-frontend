import "server-only";

import { authenticatedApiFetch } from "@/features/auth/api";
import type { CheckoutOrder } from "@/types/order";

export function checkoutCart(addressId: number): Promise<CheckoutOrder> {
  return authenticatedApiFetch<CheckoutOrder>("/cart/checkout", {
    method: "POST",
    body: { addressId },
  });
}
