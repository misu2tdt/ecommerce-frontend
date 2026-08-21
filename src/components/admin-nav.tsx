import Link from "next/link";

const links = [
  ["Dashboard", "/admin"],
  ["Products", "/admin/products"],
  ["Orders", "/admin/orders"],
  ["Reviews", "/admin/reviews"],
  ["Categories", "/admin/categories"],
  ["Brands", "/admin/brands"],
] as const;

export function AdminNav() {
  return (
    <nav aria-label="Admin sections" className="flex flex-wrap gap-2">
      {links.map(([label, href]) => (
        <Link key={href} href={href} className="min-h-10 rounded-lg border border-emerald-900/20 bg-white px-4 py-2 text-sm font-semibold text-emerald-950 hover:border-emerald-700 hover:bg-emerald-50 focus-visible:outline-2 focus-visible:outline-emerald-800">
          {label}
        </Link>
      ))}
      <Link href="/products" className="min-h-10 rounded-lg px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-white focus-visible:outline-2 focus-visible:outline-emerald-800">
        Back to storefront
      </Link>
    </nav>
  );
}
