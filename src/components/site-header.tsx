import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="border-b border-emerald-950/10 bg-white">
      <div className="mx-auto flex min-h-16 max-w-6xl items-center justify-between gap-6 px-6">
        <Link
          href="/"
          className="text-lg font-bold tracking-tight text-emerald-950 focus-visible:outline-2 focus-visible:outline-emerald-800"
        >
          Evergreen Store
        </Link>
        <nav aria-label="Primary navigation">
          <Link
            href="/products"
            className="rounded px-2 py-2 text-sm font-semibold text-slate-700 hover:text-emerald-800 focus-visible:outline-2 focus-visible:outline-emerald-800"
          >
            Products
          </Link>
        </nav>
      </div>
    </header>
  );
}
