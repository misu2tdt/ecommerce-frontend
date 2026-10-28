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
            className={`inline-flex min-h-11 items-center rounded-md border px-4 py-2 text-body-sm font-semibold focus-visible:outline-2 focus-visible:outline-brand ${
              isCurrent
                ? "border-brand bg-brand text-white"
                : "border-line bg-surface text-neutral-700 hover:border-brand hover:bg-brand-soft"
            }`}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
