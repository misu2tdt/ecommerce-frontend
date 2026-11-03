import "server-only";

import {
  authenticatedApiFetch,
  authenticatedApiFetchPage,
} from "@/features/auth/api";
import type { CustomerOrder } from "@/types/order";

export function getOrders(): Promise<CustomerOrder[]> {
  return authenticatedApiFetch<CustomerOrder[]>("/orders");
}

export function getOrdersPage(page: number) {
  return authenticatedApiFetchPage<CustomerOrder>("/orders", page);
}

export function getOrder(orderId: number): Promise<CustomerOrder> {
  return authenticatedApiFetch<CustomerOrder>(`/orders/${orderId}`);
}

export function cancelOrder(orderId: number): Promise<unknown> {
  return authenticatedApiFetch<unknown>(`/orders/${orderId}/cancel`, {
    method: "POST",
  });
}
