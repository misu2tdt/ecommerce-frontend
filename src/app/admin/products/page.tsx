import type { Metadata } from "next";
import Link from "next/link";
import { FeedbackState } from "@/components/feedback-state";
import { getAdminProducts } from "@/features/admin/api";
import { apiErrorMessage } from "@/lib/api";
import { formatPriceRange } from "@/lib/money";

import { buttonStyles } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Badge } from "@/components/ui/badge";
export const metadata: Metadata = { title: "Admin Products" };
export default async function ProductsPage() {
  let products;
  try { products = await getAdminProducts(); } catch (error) { return <FeedbackState title="Products unavailable" description={apiErrorMessage(error)} />; }
  return <><div className="flex flex-wrap items-end justify-between gap-4"><div><Eyebrow>Catalog</Eyebrow><h2 className="mt-2 text-heading font-bold text-brand-strong">Products</h2><p className="mt-3 text-neutral-600">Product parents, with pricing and stock derived from active SKUs.</p></div><Link href="/admin/products/new" className={buttonStyles({ variant: "primary", size: "md" })}>Create Product</Link></div>
    {products.length === 0 ? <div className="mt-8 rounded-md border border-dashed border-field-border bg-surface p-10 text-center text-neutral-600">No Products yet.</div> : <div className="mt-8 overflow-hidden rounded-md border border-line bg-surface"><div className="overflow-x-auto"><table className="min-w-full divide-y divide-line"><thead className="bg-surface-muted"><tr>{["Product", "Status", "Category / Brand", "Availability", ""].map((heading) => <th key={heading} scope="col" className="px-5 py-3 text-left uppercase text-neutral-600 text-caption font-semibold tracking-eyebrow">{heading}</th>)}</tr></thead><tbody className="divide-y divide-line">{products.map((product) => <tr key={product.id}><td className="px-5 py-4"><p className="font-bold text-brand-strong">{product.name}</p><p className="mt-1 text-body-sm text-neutral-600">/{product.slug}</p></td><td className="px-5 py-4"><Badge variant={product.status === "active" ? "success" : "neutral"} className="uppercase">{product.status}</Badge></td><td className="px-5 py-4 text-body-sm text-neutral-700">{product.category.name}<br /><span className="text-neutral-600">{product.brand?.name ?? "No brand"}</span></td><td className="px-5 py-4 text-body-sm text-neutral-700">{formatPriceRange(product.minPrice, product.maxPrice)}<br /><span className={product.inStock ? "text-success" : "text-amber-700"}>{product.inStock ? "In stock" : "Unavailable"}</span></td><td className="px-5 py-4 text-right"><Link href={`/admin/products/${product.id}`} className="font-semibold text-brand underline focus-visible:outline-2 focus-visible:outline-brand">Manage</Link></td></tr>)}</tbody></table></div></div>}
  </>;
}
