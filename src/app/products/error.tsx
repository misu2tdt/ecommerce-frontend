"use client";

export default function ProductsError({ reset }: { reset: () => void }) {
  return (
    <section className="mx-auto max-w-6xl px-6 py-16">
      <div className="rounded-xl border border-red-200 bg-white px-6 py-12 text-center shadow-sm">
        <h2 className="text-xl font-semibold text-slate-900">
          Catalog unavailable
        </h2>
        <p className="mt-3 text-sm text-slate-600">
          We could not load the catalog. Check the backend and try again.
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-6 min-h-11 rounded-md bg-emerald-800 px-4 py-2 font-semibold text-white hover:bg-emerald-900 focus-visible:outline-2 focus-visible:outline-emerald-800"
        >
          Try again
        </button>
      </div>
    </section>
  );
}
