import type { Metadata } from "next";
import Link from "next/link";
import { FeedbackState } from "@/components/feedback-state";
import { getAdminProducts } from "@/features/admin/api";
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
  const cards = [
    { label: "Products", value: data.products.length, href: "/admin/products", detail: `${data.products.filter((item) => item.status === "active").length} active` },
    { label: "Categories", value: data.categories.length, href: "/admin/categories", detail: "Real catalog records" },
    { label: "Brands", value: data.brands.length, href: "/admin/brands", detail: "Real catalog records" },
  ];
  return <><div><Eyebrow>Dashboard</Eyebrow><h2 className="mt-2 text-heading font-bold tracking-tight text-brand-strong">Catalog overview</h2><p className="mt-3 text-neutral-600">Live record counts from the existing catalog APIs.</p></div><div className="mt-8 grid gap-5 sm:grid-cols-3">{cards.map((card) => <Link key={card.href} href={card.href} className="rounded-md border border-line bg-surface p-6 hover:border-brand focus-visible:outline-2 focus-visible:outline-brand"><p className="text-body-sm font-semibold text-neutral-600">{card.label}</p><p className="mt-2 text-display font-bold text-brand-strong">{card.value}</p><p className="mt-2 text-body-sm text-brand">{card.detail}</p></Link>)}</div></>;
}
