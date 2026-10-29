import Link from "next/link";

import { buttonStyles } from "@/components/ui/button";
export default function OrderNotFound() {
  return (
    <section className="mx-auto max-w-3xl px-6 py-16">
      <div className="rounded-md border border-line bg-surface p-8 text-center">
        <h1 className="font-bold text-brand-strong text-heading">Order not found</h1>
        <p className="mt-3 text-neutral-600">
          We could not find this order in your account.
        </p>
        <Link
          href="/account/orders"
          className={buttonStyles({ variant: "secondary", size: "md", className: "mt-6" })}
        >
          View all orders
        </Link>
      </div>
    </section>
  );
}
