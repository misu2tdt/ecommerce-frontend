export default function ProductDetailLoading() {
  return (
    <section
      className="mx-auto grid max-w-6xl gap-10 px-6 py-14 lg:grid-cols-2"
      aria-busy="true"
      aria-label="Loading product"
    >
      <div className="aspect-[4/3] animate-pulse rounded-2xl bg-slate-200" />
      <div className="space-y-5 py-4">
        <div className="h-4 w-32 animate-pulse rounded bg-slate-200" />
        <div className="h-10 w-3/4 animate-pulse rounded bg-slate-200" />
        <div className="h-7 w-48 animate-pulse rounded bg-slate-100" />
        <div className="h-24 w-full animate-pulse rounded bg-slate-100" />
      </div>
    </section>
  );
}
