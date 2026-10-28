import type { Metadata } from "next";
import { NamedCatalogManager } from "@/components/admin-forms";
import { FeedbackState } from "@/components/feedback-state";
import { getCategories } from "@/features/catalog/api";
import { apiErrorMessage } from "@/lib/api";

import { Eyebrow } from "@/components/ui/eyebrow";
export const metadata: Metadata = { title: "Admin Categories" };
export default async function CategoriesPage() {
  let items;
  try {
    items = await getCategories();
  } catch (error) { return <FeedbackState title="Categories unavailable" description={apiErrorMessage(error)} />; }
  return <><PageHeading title="Categories" description="Create and maintain Product groupings. Slugs are backend-generated." /><div className="mt-8"><NamedCatalogManager resource="category" items={items} /></div></>;
}
function PageHeading({ title, description }: { title: string; description: string }) { return <div><Eyebrow>Catalog</Eyebrow><h2 className="mt-2 text-heading font-bold text-brand-strong">{title}</h2><p className="mt-3 text-neutral-600">{description}</p></div>; }
