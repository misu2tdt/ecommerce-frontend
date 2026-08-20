import type { Metadata } from "next";
import Link from "next/link";
import { FeedbackState } from "@/components/feedback-state";
import { getAdminProducts } from "@/features/admin/api";
import { apiErrorMessage } from "@/lib/api";
import { formatPriceRange } from "@/lib/money";

export const metadata: Metadata = { title: "Admin Products" };
export default async function ProductsPage() {
  let products;
  try { products = await getAdminProducts(); } catch (error) { return <FeedbackState title="Products unavailable" description={apiErrorMessage(error)} />; }
  return <><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm font-bold uppercase tracking-[0.16em] text-emerald-700">Catalog</p><h2 className="mt-2 text-3xl font-bold text-slate-950">Products</h2><p className="mt-3 text-slate-600">Product parents, with pricing and stock derived from active SKUs.</p></div><Link href="/admin/products/new" className="min-h-11 rounded-lg bg-emerald-800 px-5 py-2.5 font-semibold text-white hover:bg-emerald-900 focus-visible:outline-2 focus-visible:outline-emerald-800">Create Product</Link></div>
    {products.length === 0 ? <div className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-600">No Products yet.</div> : <div className="mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="overflow-x-auto"><table className="min-w-full divide-y divide-slate-200"><thead className="bg-slate-50"><tr>{["Product", "Status", "Category / Brand", "Availability", ""].map((heading) => <th key={heading} scope="col" className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-600">{heading}</th>)}</tr></thead><tbody className="divide-y divide-slate-200">{products.map((product) => <tr key={product.id}><td className="px-5 py-4"><p className="font-bold text-slate-950">{product.name}</p><p className="mt-1 text-sm text-slate-500">/{product.slug}</p></td><td className="px-5 py-4"><span className={`rounded-full px-3 py-1 text-xs font-bold uppercase ${product.status === "active" ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-700"}`}>{product.status}</span></td><td className="px-5 py-4 text-sm text-slate-700">{product.category.name}<br /><span className="text-slate-500">{product.brand?.name ?? "No brand"}</span></td><td className="px-5 py-4 text-sm text-slate-700">{formatPriceRange(product.minPrice, product.maxPrice)}<br /><span className={product.inStock ? "text-emerald-700" : "text-amber-700"}>{product.inStock ? "In stock" : "Unavailable"}</span></td><td className="px-5 py-4 text-right"><Link href={`/admin/products/${product.id}`} className="font-semibold text-emerald-800 underline focus-visible:outline-2 focus-visible:outline-emerald-800">Manage</Link></td></tr>)}</tbody></table></div></div>}
  </>;
}
