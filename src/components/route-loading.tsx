interface RouteLoadingProps {
  label: string;
  width?: "content" | "wide";
}

export function RouteLoading({ label, width = "wide" }: RouteLoadingProps) {
  return (
    <section
      className={`mx-auto px-6 py-12 ${width === "content" ? "max-w-3xl" : "max-w-6xl"}`}
      aria-busy="true"
      aria-live="polite"
    >
      <span className="sr-only">{label}</span>
      <div className="h-4 w-28 animate-pulse rounded bg-slate-200" />
      <div className="mt-3 h-10 w-64 max-w-full animate-pulse rounded bg-slate-200" />
      <div className="mt-8 grid gap-5 sm:grid-cols-2">
        {Array.from({ length: 4 }, (_, index) => (
          <div
            key={index}
            className="h-40 animate-pulse rounded-2xl border border-slate-200 bg-white"
          />
        ))}
      </div>
    </section>
  );
}
