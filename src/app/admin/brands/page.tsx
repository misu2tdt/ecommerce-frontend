import type { Metadata } from "next";
import { NamedCatalogManager } from "@/components/admin-forms";
import { FeedbackState } from "@/components/feedback-state";
import { getBrands } from "@/features/catalog/api";
import { apiErrorMessage } from "@/lib/api";

export const metadata: Metadata = { title: "Admin Brands" };
export default async function BrandsPage() {
  let items;
  try {
    items = await getBrands();
  } catch (error) { return <FeedbackState title="Brands unavailable" description={apiErrorMessage(error)} />; }
  return <><div><p className="text-sm font-bold uppercase tracking-[0.16em] text-emerald-700">Catalog</p><h2 className="mt-2 text-3xl font-bold text-slate-950">Brands</h2><p className="mt-3 text-slate-600">Maintain optional Product brands. Slugs are backend-generated.</p></div><div className="mt-8"><NamedCatalogManager resource="brand" items={items} /></div></>;
}
