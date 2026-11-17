"use client";

import { SectionEmpty, SkeletonBlock } from "@/components/analytics-section";
import { formatCount, formatShare, shareOf } from "@/lib/analytics";
import { formatVnd } from "@/lib/money";
import { adminStatusLabel } from "@/lib/order-status";
import type { OrdersByStatus } from "@/types/analytics";
import type { OrderStatus } from "@/types/order";

// Bars are neutral; only the two statuses that are not revenue stand out, and
// every row says its status, count and share in words as well.
const BAR_TONE: Record<OrderStatus, string> = {
  pending: "bg-amber-600",
  confirmed: "bg-neutral-700",
  processing: "bg-neutral-700",
  shipped: "bg-neutral-700",
  delivered: "bg-neutral-700",
  cancelled: "bg-red-700",
};

export function StatusSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 6 }, (_, index) => (
        <SkeletonBlock key={index} className="h-12" />
      ))}
    </div>
  );
}

export function StatusBreakdown({ data }: { data: OrdersByStatus }) {
  if (data.totalOrders === 0) {
    return (
      <SectionEmpty
        title="No orders in this period"
        description="Orders placed on these days will be counted here by status."
      />
    );
  }
  return (
    <>
      <ul className="space-y-4">
        {data.statuses.map((row) => {
          const share = shareOf(row.orderCount, data.totalOrders);
          return (
            <li key={row.status} data-status={row.status}>
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <span className="font-semibold text-brand-strong">
                  {adminStatusLabel(row.status)}
                </span>
                <span className="text-body-sm text-neutral-700">
                  <span data-status-count>{formatCount(row.orderCount)}</span>{" "}
                  {row.orderCount === 1 ? "order" : "orders"} (
                  {formatShare(row.orderCount, data.totalOrders)}),{" "}
                  <span data-status-value>{formatVnd(row.totalValue)}</span>
                </span>
              </div>
              <div
                aria-hidden="true"
                className="mt-2 h-3 overflow-hidden rounded-full bg-neutral-200"
              >
                <div
                  className={`h-full rounded-full ${BAR_TONE[row.status]}`}
                  style={{ width: `${(share * 100).toFixed(2)}%` }}
                />
              </div>
            </li>
          );
        })}
      </ul>
      <p className="mt-4 text-body-sm text-neutral-600">
        {formatCount(data.totalOrders)} orders were placed in this period. The
        value is the sum of the order totals. It is revenue only for confirmed,
        processing, shipped and delivered orders; pending orders are not paid
        yet and cancelled orders never will be.
      </p>
    </>
  );
}
