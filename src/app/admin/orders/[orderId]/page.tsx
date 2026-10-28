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

import { Eyebrow } from "@/components/ui/eyebrow";
export const metadata: Metadata = { title: "Admin Order details" };

export default async function AdminOrderDetailPage({ params }: { params: Promise<{ orderId: string }> }) {
  const rawId = (await params).orderId;
  if (!/^[1-9]\d*$/.test(rawId)) notFound();
  let order;
  try { order = await getAdminOrder(Number(rawId)); } catch (error) { if (error instanceof ApiError && error.status === 404) notFound(); return <FeedbackState title="Order unavailable" description={apiErrorMessage(error)} />; }
  const shipping = order.shippingAddress;
  const locality = [shipping.ward, shipping.district, shipping.city, shipping.stateProvince].filter(Boolean);
  return <><Link href="/admin/orders" className="font-semibold text-brand underline focus-visible:outline-2 focus-visible:outline-brand">← Orders</Link><div className="mt-5 flex flex-wrap items-start justify-between gap-4"><div><div className="flex flex-wrap items-center gap-3"><h2 className="text-heading font-bold text-brand-strong">Order #{order.id}</h2><OrderStatusBadge status={order.status} /></div><p className="mt-2 text-neutral-600">Customer User #{order.userId} · Placed {formatDateTime(order.createdAt)}</p><p className="mt-1 text-body-sm text-neutral-600">Last updated {formatDateTime(order.updatedAt)}</p></div><p className="text-heading font-bold text-brand-strong">{formatVnd(order.totalPrice)}</p></div>
    <section className="mt-8"><h3 className="mb-4 text-title font-bold text-brand-strong">Lifecycle</h3><OrderStatusProgress status={order.status} /></section>
    <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start"><section><h3 className="text-heading font-bold text-brand-strong">Purchased items</h3><div className="mt-4 space-y-4">{order.items.map((item) => <article key={item.id} className="rounded-md border border-line bg-surface p-5"><div className="flex flex-wrap justify-between gap-4"><div><Link href={`/products/${item.variant.product.slug}`} className="text-title font-bold text-brand-strong hover:text-brand focus-visible:outline-2 focus-visible:outline-brand">{item.variant.product.name}</Link><p className="mt-1 font-semibold text-neutral-700">{item.variant.name}</p><Eyebrow className="mt-1 text-neutral-600">SKU {item.variant.sku}</Eyebrow></div><p className="text-title font-bold text-brand-strong">{formatVnd(item.lineTotal)}</p></div>{Object.keys(item.variant.attributes).length > 0 && <dl className="mt-4 flex flex-wrap gap-2">{Object.entries(item.variant.attributes).map(([key, value]) => <div key={key} className="rounded-md bg-brand-soft px-3 py-1.5 text-body-sm"><dt className="inline font-semibold text-neutral-600">{formatAttributeLabel(key)}: </dt><dd className="inline text-neutral-800">{value}</dd></div>)}</dl>}<dl className="mt-4 grid grid-cols-2 gap-3 text-body-sm sm:grid-cols-3"><div><dt className="text-neutral-600">Purchase-time price</dt><dd className="mt-1 font-semibold">{formatVnd(item.price)}</dd></div><div><dt className="text-neutral-600">Quantity</dt><dd className="mt-1 font-semibold">{item.quantity}</dd></div><div><dt className="text-neutral-600">Line total</dt><dd className="mt-1 font-semibold">{formatVnd(item.lineTotal)}</dd></div></dl></article>)}</div></section>
      <aside className="space-y-6 lg:sticky lg:top-6"><section className="rounded-md border border-line bg-surface p-5"><h3 className="text-title font-bold text-brand-strong">Shipping snapshot</h3><p className="mt-2 text-body-sm text-neutral-600">Immutable checkout snapshot; current saved Addresses are not consulted.</p><div className="mt-4 text-body text-neutral-700"><p className="font-semibold text-brand-strong">{shipping.recipientName} · {shipping.phone}</p><p>{shipping.addressLine1}</p>{shipping.addressLine2 && <p>{shipping.addressLine2}</p>}<p>{locality.join(", ")}</p><p>{[shipping.postalCode, shipping.countryCode].filter(Boolean).join(" · ")}</p></div></section><AdminOrderStatusControl orderId={order.id} status={order.status} /></aside></div>
  </>;
}
