import type { Metadata } from "next";
import Link from "next/link";
import { FeedbackState } from "@/components/feedback-state";
import { getAdminProducts } from "@/features/admin/api";
import { getBrands, getCategories } from "@/features/catalog/api";
import { apiErrorMessage } from "@/lib/api";

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
  return <><div><p className="text-sm font-bold uppercase tracking-[0.16em] text-emerald-700">Dashboard</p><h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">Catalog overview</h2><p className="mt-3 text-slate-600">Live record counts from the existing catalog APIs.</p></div><div className="mt-8 grid gap-5 sm:grid-cols-3">{cards.map((card) => <Link key={card.href} href={card.href} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:border-emerald-600 focus-visible:outline-2 focus-visible:outline-emerald-800"><p className="text-sm font-semibold text-slate-600">{card.label}</p><p className="mt-2 text-4xl font-bold text-slate-950">{card.value}</p><p className="mt-2 text-sm text-emerald-800">{card.detail}</p></Link>)}</div></>;
}
