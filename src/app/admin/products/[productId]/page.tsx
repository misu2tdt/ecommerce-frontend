import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ImageManager, ProductDelete, ProductForm, VariantManager } from "@/components/admin-forms";
import { FeedbackState } from "@/components/feedback-state";
import { getAdminProduct } from "@/features/admin/api";
import { getBrands, getCategories } from "@/features/catalog/api";
import { ApiError, apiErrorMessage } from "@/lib/api";

import { buttonStyles } from "@/components/ui/button";
export const metadata: Metadata = { title: "Manage Product" };
export default async function ManageProductPage({ params }: { params: Promise<{ productId: string }> }) {
  const rawId = (await params).productId;
  if (!/^[1-9]\d*$/.test(rawId)) notFound();
  let data;
  try { const [product, categories, brands] = await Promise.all([getAdminProduct(Number(rawId)), getCategories(), getBrands()]); data = { product, categories, brands }; } catch (error) { if (error instanceof ApiError && error.status === 404) notFound(); return <FeedbackState title="Product unavailable" description={apiErrorMessage(error)} />; }
  return <><div className="flex flex-wrap items-start justify-between gap-4"><div><Link href="/admin/products" className="font-semibold text-brand underline focus-visible:outline-2 focus-visible:outline-brand">← Products</Link><h2 className="mt-4 text-heading font-bold text-brand-strong">{data.product.name}</h2><p className="mt-2 text-neutral-600">Manage the Product parent, purchasable SKUs, and media.</p></div>{data.product.status === "active" && <Link href={`/products/${data.product.slug}`} className={buttonStyles({ variant: "secondary", size: "md" })}>View storefront</Link>}</div>
    <section className="mt-8 rounded-md border border-line bg-surface p-6 sm:p-8"><h3 className="text-heading font-bold text-brand-strong">Product details</h3><div className="mt-6"><ProductForm categories={data.categories} brands={data.brands} product={data.product} /></div><ProductDelete product={data.product} /></section>
    <section className="mt-8 rounded-md border border-line bg-surface p-6 sm:p-8"><h3 className="text-heading font-bold text-brand-strong">Variants</h3><p className="mt-2 text-neutral-600">SKU is fixed after creation. Price is integer VND.</p><div className="mt-6"><VariantManager product={data.product} /></div></section>
    <section className="mt-8 rounded-md border border-line bg-surface p-6 sm:p-8"><h3 className="text-heading font-bold text-brand-strong">Product images</h3><p className="mt-2 text-neutral-600">Primary state and position are persisted by the backend.</p><div className="mt-6"><ImageManager product={data.product} /></div></section></>;
}
