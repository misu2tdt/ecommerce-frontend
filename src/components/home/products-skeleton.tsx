// Stands in for the home page's product sections (featured, brands, everyday
// essentials) while their products come from the API. The picture and the
// categories above it are not waiting for anything and are already on screen.
export function HomeProductsSkeleton() {
  return (
    <section
      className="border-t border-line bg-surface-muted"
      aria-busy="true"
      aria-label="Loading products"
    >
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
        <div className="h-4 w-20 animate-pulse rounded bg-neutral-200" />
        <div className="mt-3 h-8 w-72 max-w-full animate-pulse rounded bg-neutral-200" />
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => (
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
      </div>
    </section>
  );
}
