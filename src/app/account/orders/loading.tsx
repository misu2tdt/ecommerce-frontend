export default function OrdersLoading() {
  return (
    <section
      className="mx-auto max-w-5xl px-6 py-12"
      aria-busy="true"
      aria-label="Loading Orders"
    >
      <div className="h-9 w-56 animate-pulse rounded bg-slate-200" />
      <div className="mt-8 space-y-5">
        {Array.from({ length: 3 }, (_, index) => (
          <div
            key={index}
            className="h-48 animate-pulse rounded-2xl border border-slate-200 bg-white"
          />
        ))}
      </div>
    </section>
  );
}
