import type { Metadata } from "next";
import Link from "next/link";
import { FeedbackState } from "@/components/feedback-state";
import { OrderStatusBadge } from "@/components/order-status";
import { getAdminOrders } from "@/features/admin/api";
import { apiErrorMessage } from "@/lib/api";
import { formatDateTime } from "@/lib/dates";
import { formatVnd } from "@/lib/money";

export const metadata: Metadata = { title: "Admin Orders" };

export default async function AdminOrdersPage() {
  let orders;
  try { orders = await getAdminOrders(); } catch (error) { return <FeedbackState title="Orders unavailable" description={apiErrorMessage(error)} />; }
  return <><div><p className="text-sm font-bold uppercase tracking-[0.16em] text-emerald-700">Operations</p><h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">Orders</h2><p className="mt-3 text-slate-600">All Orders in backend order. Totals and item prices are purchase-time VND values.</p></div>
    {orders.length === 0 ? <div className="mt-8"><FeedbackState title="No Orders" description="Customer Orders will appear here after checkout." /></div> : <div className="mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="overflow-x-auto"><table className="min-w-full divide-y divide-slate-200"><thead className="bg-slate-50"><tr>{["Order", "Customer", "Placed", "Status", "Items", "Total", ""].map((heading) => <th key={heading} scope="col" className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-600">{heading}</th>)}</tr></thead><tbody className="divide-y divide-slate-200">{orders.map((order) => <tr key={order.id}><td className="whitespace-nowrap px-5 py-4 font-bold text-slate-950">#{order.id}</td><td className="whitespace-nowrap px-5 py-4 text-sm text-slate-700">User #{order.userId}</td><td className="whitespace-nowrap px-5 py-4 text-sm text-slate-600">{formatDateTime(order.createdAt)}</td><td className="px-5 py-4"><OrderStatusBadge status={order.status} /></td><td className="px-5 py-4 text-sm text-slate-700">{order.items.length} {order.items.length === 1 ? "line" : "lines"}<span className="mt-1 block max-w-64 truncate text-xs text-slate-500">{order.items.map((item) => item.variant.product.name).join(", ")}</span></td><td className="whitespace-nowrap px-5 py-4 font-bold text-emerald-900">{formatVnd(order.totalPrice)}</td><td className="px-5 py-4 text-right"><Link href={`/admin/orders/${order.id}`} className="font-semibold text-emerald-800 underline focus-visible:outline-2 focus-visible:outline-emerald-800">View</Link></td></tr>)}</tbody></table></div></div>}
  </>;
}
