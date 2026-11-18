// Only the collections list has a loading screen. It sits in the (list) group, so
// it does not wrap the pages of single collections: a loading screen starts the
// response before the page runs, and an unknown collection must still answer with
// a real 404 (see tests/browser/collections.spec.ts).
export default function CollectionsLoading() {
  return (
    <section
      className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8"
      aria-busy="true"
      aria-label="Loading collections"
    >
      <div className="border-b border-line pb-6">
        <div className="h-4 w-16 animate-pulse rounded bg-neutral-200" />
        <div className="mt-3 h-10 w-64 max-w-full animate-pulse rounded bg-neutral-200" />
        <div className="mt-3 h-4 w-full max-w-xl animate-pulse rounded bg-brand-soft" />
      </div>
      <div className="mt-8 grid gap-x-4 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, index) => (
          <div key={index} className="space-y-3">
            <div className="aspect-[3/2] animate-pulse rounded-md bg-brand-soft" />
            <div className="h-5 w-2/3 animate-pulse rounded bg-neutral-200" />
            <div className="h-4 w-1/2 animate-pulse rounded bg-brand-soft" />
          </div>
        ))}
      </div>
    </section>
  );
}
