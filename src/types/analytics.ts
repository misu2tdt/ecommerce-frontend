import type { OrderStatus } from "@/types/order";

// The answers of GET /admin/analytics/*. Money is whole VND. Dates are calendar
// days ("YYYY-MM-DD") in the requested time zone. See the backend's
// docs/analytics.md for the definitions.

export type AnalyticsSection =
  | "overview"
  | "revenue-by-day"
  | "orders-by-status"
  | "top-products";

export interface AnalyticsRangeView {
  from: string;
  to: string;
  days: number;
  timezone: string;
}

export interface PeriodFigures {
  revenue: number;
  orderCount: number;
  averageOrderValue: number;
  placedOrders: number;
  cancelledOrders: number;
  // cancelledOrders / placedOrders, 0 to 1.
  cancelledRate: number;
  newCustomers: number;
}

export interface AnalyticsOverview {
  currency: string;
  revenueStatuses: OrderStatus[];
  range: AnalyticsRangeView;
  previousRange: { from: string; to: string; days: number };
  current: PeriodFigures;
  previous: PeriodFigures;
}

export interface RevenueDay {
  date: string;
  revenue: number;
  orders: number;
}

export interface RevenueByDay {
  currency: string;
  revenueStatuses: OrderStatus[];
  range: AnalyticsRangeView;
  days: RevenueDay[];
}

export interface StatusCount {
  status: OrderStatus;
  orderCount: number;
  totalValue: number;
}

export interface OrdersByStatus {
  currency: string;
  range: AnalyticsRangeView;
  totalOrders: number;
  statuses: StatusCount[];
}

export interface TopEntry {
  id: number;
  name: string;
  slug: string;
  units: number;
  revenue: number;
  orders: number;
}

export interface TopProducts {
  currency: string;
  revenueStatuses: OrderStatus[];
  range: AnalyticsRangeView;
  limit: number;
  products: TopEntry[];
  categories: TopEntry[];
}

export interface AnalyticsPayloads {
  overview: AnalyticsOverview;
  "revenue-by-day": RevenueByDay;
  "orders-by-status": OrdersByStatus;
  "top-products": TopProducts;
}
