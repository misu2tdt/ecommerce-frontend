"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  ["Overview", "/account"],
  ["Orders", "/account/orders"],
  ["Addresses", "/account/addresses"],
] as const;

export function AccountNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Account sections" className="flex flex-wrap gap-2">
      {links.map(([label, href]) => {
        const isCurrent =
          href === "/account"
            ? pathname === href
            : pathname === href || pathname.startsWith(`${href}/`);

        return (
          <Link
            key={href}
            href={href}
            aria-current={isCurrent ? "page" : undefined}
            className={`inline-flex min-h-11 items-center rounded-lg border px-4 py-2 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-emerald-800 ${
              isCurrent
                ? "border-emerald-800 bg-emerald-800 text-white"
                : "border-slate-200 bg-white text-slate-700 hover:border-emerald-700 hover:bg-emerald-50"
            }`}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
