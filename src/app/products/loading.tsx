export default function ProductsLoading() {
  return (
    <section
      className="mx-auto max-w-6xl px-6 py-12"
      aria-busy="true"
      aria-label="Loading products"
    >
      <div className="h-9 w-64 animate-pulse rounded bg-neutral-200" />
      <div className="mt-8 rounded-md border border-line bg-surface p-6">
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }, (_, index) => (
            <div key={index} className="space-y-2">
              <div className="h-4 w-24 animate-pulse rounded bg-neutral-200" />
              <div className="h-11 animate-pulse rounded-md bg-brand-soft" />
            </div>
          ))}
        </div>
      </div>
      <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, index) => (
          <div
            key={index}
            className="overflow-hidden rounded-md border border-line bg-surface"
          >
            <div className="aspect-[4/3] animate-pulse bg-brand-soft" />
            <div className="space-y-3 p-5">
              <div className="h-5 w-3/4 animate-pulse rounded bg-neutral-200" />
              <div className="h-4 w-1/2 animate-pulse rounded bg-brand-soft" />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
