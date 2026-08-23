"use client";

import Link from "next/link";

export default function GlobalError({ reset }: { reset: () => void }) {
  return (
    <section className="mx-auto max-w-3xl px-6 py-16">
      <div className="rounded-xl border border-red-200 bg-white px-6 py-12 text-center shadow-sm">
        <h1 className="text-2xl font-bold text-slate-950">
          Something went wrong
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-600">
          This page could not be completed. Try again, or return to the
          storefront.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={reset}
            className="min-h-11 rounded-lg bg-emerald-800 px-4 py-2 font-semibold text-white hover:bg-emerald-900 focus-visible:outline-2 focus-visible:outline-emerald-800"
          >
            Try again
          </button>
          <Link
            href="/"
            className="inline-flex min-h-11 items-center rounded-lg border border-slate-300 px-4 py-2 font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-emerald-800"
          >
            Return home
          </Link>
        </div>
      </div>
    </section>
  );
}
