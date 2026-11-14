import type { Metadata } from "next";
import Link from "next/link";
import { FeedbackState } from "@/components/feedback-state";
import { getAdminProducts } from "@/features/admin/api";
import { adminGetCollectionsPage } from "@/features/collections/admin-api";
import { getUnresolvedReconciliationCount } from "@/features/reconciliation/api";
import { getBrands, getCategories } from "@/features/catalog/api";
import { apiErrorMessage } from "@/lib/api";

import { Eyebrow } from "@/components/ui/eyebrow";
export const metadata: Metadata = { title: "Admin Dashboard" };

export default async function AdminPage() {
  let data;
  try {
    const [products, categories, brands] = await Promise.all([getAdminProducts(), getCategories(), getBrands()]);
    data = { products, categories, brands };
  } catch (error) {
    return <FeedbackState title="Catalog summary unavailable" description={apiErrorMessage(error)} />;
  }
  // The collections count must never take the dashboard down (a backend without
  // collections answers 404): the card then shows a dash instead of a number.
  let collectionCount: number | null = null;
  try {
    collectionCount = (await adminGetCollectionsPage(1)).total;
  } catch {
    collectionCount = null;
  }
  // Same for the open reconciliation items: if the count cannot be read, the
  // card says so instead of showing a wrong number.
  let openReconciliation: number | null = null;
  try {
    openReconciliation = await getUnresolvedReconciliationCount();
  } catch {
    openReconciliation = null;
  }
  const cards = [
    { label: "Products", value: String(data.products.length), href: "/admin/products", detail: `${data.products.filter((item) => item.status === "active").length} active` },
    { label: "Collections", value: collectionCount === null ? "—" : String(collectionCount), href: "/admin/collections", detail: collectionCount === null ? "Unavailable right now" : "Curated product groups" },
    { label: "Reconciliation", value: openReconciliation === null ? "—" : String(openReconciliation), href: "/admin/reconciliation", detail: openReconciliation === null ? "Unavailable right now" : openReconciliation === 1 ? "Open item to review" : "Open items to review" },
    { label: "Categories", value: String(data.categories.length), href: "/admin/categories", detail: "Real catalog records" },
    { label: "Brands", value: String(data.brands.length), href: "/admin/brands", detail: "Real catalog records" },
  ];
  return <><div><Eyebrow>Dashboard</Eyebrow><h2 className="mt-2 text-heading font-bold tracking-tight text-brand-strong">Catalog overview</h2><p className="mt-3 text-neutral-600">Live record counts from the existing catalog APIs.</p></div><div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{cards.map((card) => <Link key={card.href} href={card.href} className="rounded-md border border-line bg-surface p-6 hover:border-brand focus-visible:outline-2 focus-visible:outline-brand"><p className="text-body-sm font-semibold text-neutral-600">{card.label}</p><p className="mt-2 text-display font-bold text-brand-strong">{card.value}</p><p className="mt-2 text-body-sm text-brand">{card.detail}</p></Link>)}</div></>;
}
