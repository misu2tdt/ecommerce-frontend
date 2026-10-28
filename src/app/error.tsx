"use client";

import Link from "next/link";

import { buttonStyles } from "@/components/ui/button";
export default function GlobalError({ reset }: { reset: () => void }) {
  return (
    <section className="mx-auto max-w-3xl px-6 py-16">
      <div className="rounded-md border border-red-200 bg-surface px-6 py-12 text-center">
        <h1 className="font-bold text-brand-strong text-heading">
          Something went wrong
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-body text-neutral-600">
          This page could not be completed. Try again, or return to the
          storefront.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={reset}
            className={buttonStyles({ variant: "primary", size: "md" })}
          >
            Try again
          </button>
          <Link
            href="/"
            className={buttonStyles({ variant: "secondary", size: "md" })}
          >
            Return home
          </Link>
        </div>
      </div>
    </section>
  );
}
