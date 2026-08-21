import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminOrderStatusControl } from "@/components/admin-order-status-control";
import { FeedbackState } from "@/components/feedback-state";
import { OrderStatusBadge, OrderStatusProgress } from "@/components/order-status";
import { getAdminOrder } from "@/features/admin/api";
import { formatAttributeLabel } from "@/lib/attributes";
import { ApiError, apiErrorMessage } from "@/lib/api";
import { formatDateTime } from "@/lib/dates";
import { formatVnd } from "@/lib/money";

export const metadata: Metadata = { title: "Admin Order details" };

export default async function AdminOrderDetailPage({ params }: { params: Promise<{ orderId: string }> }) {
  const rawId = (await params).orderId;
  if (!/^[1-9]\d*$/.test(rawId)) notFound();
  let order;
  try { order = await getAdminOrder(Number(rawId)); } catch (error) { if (error instanceof ApiError && error.status === 404) notFound(); return <FeedbackState title="Order unavailable" description={apiErrorMessage(error)} />; }
  const shipping = order.shippingAddress;
  const locality = [shipping.ward, shipping.district, shipping.city, shipping.stateProvince].filter(Boolean);
  return <><Link href="/admin/orders" className="font-semibold text-emerald-800 underline focus-visible:outline-2 focus-visible:outline-emerald-800">← Orders</Link><div className="mt-5 flex flex-wrap items-start justify-between gap-4"><div><div className="flex flex-wrap items-center gap-3"><h2 className="text-3xl font-bold text-slate-950">Order #{order.id}</h2><OrderStatusBadge status={order.status} /></div><p className="mt-2 text-slate-600">Customer User #{order.userId} · Placed {formatDateTime(order.createdAt)}</p><p className="mt-1 text-sm text-slate-500">Last updated {formatDateTime(order.updatedAt)}</p></div><p className="text-3xl font-bold text-emerald-900">{formatVnd(order.totalPrice)}</p></div>
    <section className="mt-8"><h3 className="mb-4 text-xl font-bold text-slate-950">Lifecycle</h3><OrderStatusProgress status={order.status} /></section>
    <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start"><section><h3 className="text-2xl font-bold text-slate-950">Purchased items</h3><div className="mt-4 space-y-4">{order.items.map((item) => <article key={item.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex flex-wrap justify-between gap-4"><div><Link href={`/products/${item.variant.product.slug}`} className="text-lg font-bold text-slate-950 hover:text-emerald-800 focus-visible:outline-2 focus-visible:outline-emerald-800">{item.variant.product.name}</Link><p className="mt-1 font-semibold text-slate-700">{item.variant.name}</p><p className="mt-1 text-xs font-bold uppercase tracking-wide text-slate-500">SKU {item.variant.sku}</p></div><p className="text-lg font-bold text-emerald-900">{formatVnd(item.lineTotal)}</p></div>{Object.keys(item.variant.attributes).length > 0 && <dl className="mt-4 flex flex-wrap gap-2">{Object.entries(item.variant.attributes).map(([key, value]) => <div key={key} className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs"><dt className="inline font-semibold text-slate-500">{formatAttributeLabel(key)}: </dt><dd className="inline text-slate-800">{value}</dd></div>)}</dl>}<dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3"><div><dt className="text-slate-500">Purchase-time price</dt><dd className="mt-1 font-semibold">{formatVnd(item.price)}</dd></div><div><dt className="text-slate-500">Quantity</dt><dd className="mt-1 font-semibold">{item.quantity}</dd></div><div><dt className="text-slate-500">Line total</dt><dd className="mt-1 font-semibold">{formatVnd(item.lineTotal)}</dd></div></dl></article>)}</div></section>
      <aside className="space-y-6 lg:sticky lg:top-6"><section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h3 className="text-xl font-bold text-slate-950">Shipping snapshot</h3><p className="mt-2 text-xs leading-5 text-slate-500">Immutable checkout snapshot; current saved Addresses are not consulted.</p><div className="mt-4 text-sm leading-6 text-slate-700"><p className="font-semibold text-slate-950">{shipping.recipientName} · {shipping.phone}</p><p>{shipping.addressLine1}</p>{shipping.addressLine2 && <p>{shipping.addressLine2}</p>}<p>{locality.join(", ")}</p><p>{[shipping.postalCode, shipping.countryCode].filter(Boolean).join(" · ")}</p></div></section><AdminOrderStatusControl orderId={order.id} status={order.status} /></aside></div>
  </>;
}
