"use client";

import { buttonStyles } from "@/components/ui/button";

export default function ProductsError({ reset }: { reset: () => void }) {
  return (
    <section className="mx-auto max-w-6xl px-6 py-16">
      <div className="rounded-md border border-red-200 bg-surface px-6 py-12 text-center">
        <h2 className="text-title font-semibold text-brand">
          Catalog unavailable
        </h2>
        <p className="mt-3 text-body-sm text-neutral-600">
          We could not load the catalog. Check the backend and try again.
        </p>
        <button
          type="button"
          onClick={reset}
          className={buttonStyles({ variant: "primary", size: "md", className: "mt-6" })}
        >
          Try again
        </button>
      </div>
    </section>
  );
}
