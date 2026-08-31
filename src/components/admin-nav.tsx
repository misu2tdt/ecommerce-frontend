"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  ["Dashboard", "/admin"],
  ["Products", "/admin/products"],
  ["Orders", "/admin/orders"],
  ["Promotions", "/admin/promotions"],
  ["Reviews", "/admin/reviews"],
  ["Categories", "/admin/categories"],
  ["Brands", "/admin/brands"],
] as const;

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Admin sections" className="flex flex-wrap gap-2">
      {links.map(([label, href]) => {
        const isCurrent =
          href === "/admin"
            ? pathname === href
            : pathname === href || pathname.startsWith(`${href}/`);

        return (
          <Link
            key={href}
            href={href}
            aria-current={isCurrent ? "page" : undefined}
            className={`inline-flex min-h-11 items-center rounded-lg border px-4 py-2 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-emerald-200 ${
              isCurrent
                ? "border-emerald-200 bg-emerald-100 text-emerald-950"
                : "border-emerald-800 bg-white text-emerald-950 hover:border-emerald-500 hover:bg-emerald-50"
            }`}
          >
            {label}
          </Link>
        );
      })}
      <Link href="/products" className="inline-flex min-h-11 items-center rounded-lg px-4 py-2 text-sm font-semibold text-emerald-100 hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-emerald-200">
        Back to storefront
      </Link>
    </nav>
  );
}
