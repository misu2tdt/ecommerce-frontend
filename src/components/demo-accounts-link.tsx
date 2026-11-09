"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { DEMO_ACCOUNTS_PATH } from "@/lib/site";

// The "Demo accounts" link of the top bar. From md up only: on a phone the bar
// has no room, and the menu drawer carries the same link instead.
export function DemoAccountsLink() {
  const current = usePathname() === DEMO_ACCOUNTS_PATH;

  return (
    <Link
      href={DEMO_ACCOUNTS_PATH}
      aria-current={current ? "page" : undefined}
      className="hidden h-11 shrink-0 items-center whitespace-nowrap rounded-md px-3 text-body-sm font-semibold text-neutral-700 transition hover:bg-brand-soft hover:text-brand-strong focus-visible:outline-2 focus-visible:outline-brand aria-[current=page]:bg-brand-soft aria-[current=page]:text-brand-strong md:inline-flex"
    >
      Demo accounts
    </Link>
  );
}
