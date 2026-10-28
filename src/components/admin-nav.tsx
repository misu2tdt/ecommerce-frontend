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
            className={`inline-flex min-h-11 items-center rounded-md border px-4 py-2 text-body-sm font-semibold focus-visible:outline-2 focus-visible:outline-white ${
              isCurrent
                ? "border-white bg-white text-brand-strong"
                : "border-neutral-600 text-neutral-200 hover:border-white hover:bg-white/10 hover:text-white"
            }`}
          >
            {label}
          </Link>
        );
      })}
      <Link href="/products" className="inline-flex min-h-11 items-center rounded-md px-4 py-2 text-body-sm font-semibold text-neutral-300 hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-white">
        Back to storefront
      </Link>
    </nav>
  );
}
