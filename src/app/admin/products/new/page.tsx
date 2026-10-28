import type { Metadata } from "next";
import Link from "next/link";
import { ProductForm } from "@/components/admin-forms";
import { FeedbackState } from "@/components/feedback-state";
import { getBrands, getCategories } from "@/features/catalog/api";
import { apiErrorMessage } from "@/lib/api";

export const metadata: Metadata = { title: "Create Product" };
export default async function NewProductPage() {
  let data;
  try { const [categories, brands] = await Promise.all([getCategories(), getBrands()]); data = { categories, brands }; } catch (error) { return <FeedbackState title="Product form unavailable" description={apiErrorMessage(error)} />; }
  if (data.categories.length === 0) return <FeedbackState title="Create a Category first" description="Every Product requires an existing Category." />;
  return <><Link href="/admin/products" className="font-semibold text-brand underline focus-visible:outline-2 focus-visible:outline-brand">← Products</Link><div className="mt-5 rounded-md border border-line bg-surface p-6 sm:p-8"><h2 className="text-heading font-bold text-brand-strong">Create Product</h2><p className="mt-2 text-neutral-600">Price and stock belong to Variants, not this Product parent.</p><div className="mt-8"><ProductForm categories={data.categories} brands={data.brands} /></div></div></>;
}
