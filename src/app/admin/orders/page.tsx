import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { FeedbackState } from "@/components/feedback-state";
import { ListPager } from "@/components/list-pager";
import { OrderStatusBadge } from "@/components/order-status";
import { getAdminOrdersPage } from "@/features/admin/api";
import type { CatalogSearchParams } from "@/features/catalog/search-params";
import { apiErrorMessage } from "@/lib/api";
import { formatDateTime } from "@/lib/dates";
import { formatVnd } from "@/lib/money";
import { pageRedirectTarget, parsePageParam, withPage } from "@/lib/pagination";

import { Eyebrow } from "@/components/ui/eyebrow";
export const metadata: Metadata = { title: "Admin Orders" };

export default async function AdminOrdersPage({ searchParams }: { searchParams: Promise<CatalogSearchParams> }) {
  const pageParam = parsePageParam((await searchParams).page);
  let result;
  try { result = await getAdminOrdersPage(pageParam.page); } catch (error) { return <FeedbackState title="Orders unavailable" description={apiErrorMessage(error)} />; }
  const redirectPage = pageRedirectTarget(pageParam, result.totalPages);
  if (redirectPage !== null) redirect(withPage("/admin/orders", "", redirectPage));
  const orders = result.items;
  return <><div><Eyebrow>Operations</Eyebrow><h2 className="mt-2 text-heading font-bold tracking-tight text-brand-strong">Orders</h2><p className="mt-3 text-neutral-600">All Orders in backend order. Totals and item prices are purchase-time VND values.</p></div>
    {orders.length === 0 ? <div className="mt-8"><FeedbackState title="No Orders" description="Customer Orders will appear here after checkout." /></div> : <div className="mt-8 overflow-hidden rounded-md border border-line bg-surface"><div className="overflow-x-auto"><table className="min-w-full divide-y divide-line"><thead className="bg-surface-muted"><tr>{["Order", "Customer", "Placed", "Status", "Items", "Total", ""].map((heading) => <th key={heading} scope="col" className="px-5 py-3 text-left uppercase text-neutral-600 text-caption font-semibold tracking-eyebrow">{heading}</th>)}</tr></thead><tbody className="divide-y divide-line">{orders.map((order) => <tr key={order.id}><td className="whitespace-nowrap px-5 py-4 font-bold text-brand-strong">#{order.id}</td><td className="whitespace-nowrap px-5 py-4 text-body-sm text-neutral-700">User #{order.userId}</td><td className="whitespace-nowrap px-5 py-4 text-body-sm text-neutral-600">{formatDateTime(order.createdAt)}</td><td className="px-5 py-4"><OrderStatusBadge status={order.status} audience="admin" /></td><td className="px-5 py-4 text-body-sm text-neutral-700">{order.items.length} {order.items.length === 1 ? "line" : "lines"}<span className="mt-1 block max-w-64 truncate text-body-sm text-neutral-600">{order.items.map((item) => item.variant.product.name).join(", ")}</span></td><td className="whitespace-nowrap px-5 py-4 font-bold text-brand-strong">{formatVnd(order.totalPrice)}</td><td className="px-5 py-4 text-right"><Link href={`/admin/orders/${order.id}`} className="font-semibold text-brand underline focus-visible:outline-2 focus-visible:outline-brand">View</Link></td></tr>)}</tbody></table></div></div>}
    <ListPager path="/admin/orders" page={pageParam.page} totalPages={result.totalPages} total={result.total} limit={result.limit} label="Orders pages" />
  </>;
}
