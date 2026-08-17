export default function ProductsLoading() {
  return (
    <section
      className="mx-auto max-w-6xl px-6 py-12"
      aria-busy="true"
      aria-label="Loading products"
    >
      <div className="h-9 w-64 animate-pulse rounded bg-slate-200" />
      <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6">
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }, (_, index) => (
            <div key={index} className="space-y-2">
              <div className="h-4 w-24 animate-pulse rounded bg-slate-200" />
              <div className="h-11 animate-pulse rounded-lg bg-slate-100" />
            </div>
          ))}
        </div>
      </div>
      <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, index) => (
          <div
            key={index}
            className="overflow-hidden rounded-xl border border-slate-200 bg-white"
          >
            <div className="aspect-[4/3] animate-pulse bg-slate-100" />
            <div className="space-y-3 p-5">
              <div className="h-5 w-3/4 animate-pulse rounded bg-slate-200" />
              <div className="h-4 w-1/2 animate-pulse rounded bg-slate-100" />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
