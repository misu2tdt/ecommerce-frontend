"use client";

import Link from "next/link";
import { SectionEmpty, SkeletonBlock } from "@/components/analytics-section";
import { formatCount } from "@/lib/analytics";
import { formatVnd } from "@/lib/money";
import type { TopEntry, TopProducts } from "@/types/analytics";

export function TopSellersSkeleton() {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <SkeletonBlock className="h-72" />
      <SkeletonBlock className="h-72" />
    </div>
  );
}

// Products link to their admin page. There is no admin page for one category,
// so a category is plain text.
function RankingTable({
  caption,
  noun,
  entries,
  linkTo,
  emptyTitle,
}: {
  caption: string;
  noun: string;
  entries: TopEntry[];
  linkTo?: (entry: TopEntry) => string;
  emptyTitle: string;
}) {
  if (entries.length === 0) {
    return (
      <SectionEmpty
        title={emptyTitle}
        description="Paid orders in this period will rank here."
      />
    );
  }
  return (
    <div className="relative overflow-hidden rounded-md border border-line bg-surface">
      <div className="overflow-x-auto">
        <table aria-label={caption} className="min-w-full divide-y divide-line">
          <thead className="bg-surface-muted">
            <tr>
              <th scope="col" className="w-10 px-3 py-3 text-left text-caption font-semibold uppercase tracking-eyebrow text-neutral-600">
                <span className="sr-only">Rank</span>
                <span aria-hidden="true">#</span>
              </th>
              <th scope="col" className="px-3 py-3 text-left text-caption font-semibold uppercase tracking-eyebrow text-neutral-600">
                {noun}
              </th>
              <th scope="col" className="px-3 py-3 text-right text-caption font-semibold uppercase tracking-eyebrow text-neutral-600">
                Units
              </th>
              <th scope="col" className="px-3 py-3 text-right text-caption font-semibold uppercase tracking-eyebrow text-neutral-600">
                Revenue
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {entries.map((entry, index) => (
              <tr key={entry.id}>
                <td className="px-3 py-3 text-body-sm text-neutral-600">
                  {index + 1}
                </td>
                <td className="min-w-0 px-3 py-3">
                  {linkTo ? (
                    <Link
                      href={linkTo(entry)}
                      className="inline-flex min-h-11 items-center break-words font-semibold text-brand-strong underline focus-visible:outline-2 focus-visible:outline-brand"
                    >
                      {entry.name}
                    </Link>
                  ) : (
                    <span className="font-semibold text-brand-strong">
                      {entry.name}
                    </span>
                  )}
                  <p className="text-body-sm text-neutral-600">
                    {formatCount(entry.orders)}{" "}
                    {entry.orders === 1 ? "order" : "orders"}
                  </p>
                </td>
                <td className="whitespace-nowrap px-3 py-3 text-right text-body-sm text-neutral-700">
                  {formatCount(entry.units)}
                </td>
                <td className="whitespace-nowrap px-3 py-3 text-right text-body-sm font-semibold text-brand-strong">
                  {formatVnd(entry.revenue)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function TopSellers({ data }: { data: TopProducts }) {
  return (
    <>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="min-w-0">
          <h4 className="mb-3 font-semibold text-brand-strong">
            Top {data.limit} products
          </h4>
          <RankingTable
            caption="Top products"
            noun="Product"
            entries={data.products}
            linkTo={(entry) => `/admin/products/${entry.id}`}
            emptyTitle="No products sold in this period"
          />
        </div>
        <div className="min-w-0">
          <h4 className="mb-3 font-semibold text-brand-strong">
            Top {data.limit} categories
          </h4>
          <RankingTable
            caption="Top categories"
            noun="Category"
            entries={data.categories}
            emptyTitle="No categories sold in this period"
          />
        </div>
      </div>
      <p className="mt-4 text-body-sm text-neutral-600">
        Ranked by revenue, from the order lines of paid orders. A line&apos;s
        revenue is price times quantity before any order-level coupon discount,
        so these figures can add up to more than the revenue above.
      </p>
    </>
  );
}
