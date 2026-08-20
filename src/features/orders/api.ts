import "server-only";

import { authenticatedApiFetch } from "@/features/auth/api";
import type { CustomerOrder } from "@/types/order";

export function getOrders(): Promise<CustomerOrder[]> {
  return authenticatedApiFetch<CustomerOrder[]>("/orders");
}

export function getOrder(orderId: number): Promise<CustomerOrder> {
  return authenticatedApiFetch<CustomerOrder>(`/orders/${orderId}`);
}

export function cancelOrder(orderId: number): Promise<unknown> {
  return authenticatedApiFetch<unknown>(`/orders/${orderId}/cancel`, {
    method: "POST",
  });
}
