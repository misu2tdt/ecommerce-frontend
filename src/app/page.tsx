import Link from "next/link";

export default function Home() {
  return (
    <section className="border-b border-emerald-950/10 bg-[linear-gradient(135deg,#edf7ef_0%,#f8faf8_55%,#eef4ec_100%)]">
      <div className="mx-auto grid max-w-6xl gap-12 px-6 py-20 sm:py-28 lg:grid-cols-[1.3fr_0.7fr] lg:items-center">
        <div>
          <p className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-emerald-700">
            Local demo storefront
          </p>
          <h1 className="max-w-3xl text-4xl font-bold tracking-tight text-emerald-950 sm:text-6xl">
            Useful technology, presented clearly.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
            Browse the live catalog served by the NestJS backend, compare
            variants, and see current integer-VND prices and stock.
          </p>
          <Link
            href="/products"
            className="mt-8 inline-flex min-h-11 items-center justify-center rounded-md bg-emerald-800 px-5 py-3 font-semibold text-white transition hover:bg-emerald-900 focus-visible:outline-2 focus-visible:outline-emerald-800"
          >
            Browse products
          </Link>
        </div>
        <div className="rounded-2xl border border-emerald-900/10 bg-white/80 p-7 shadow-sm">
          <p className="text-sm font-semibold text-emerald-800">
            Catalog foundation
          </p>
          <ul className="mt-5 space-y-4 text-sm leading-6 text-slate-600">
            <li>Live product and variant inventory</li>
            <li>Clear VND price ranges</li>
            <li>Verified ratings at a glance</li>
          </ul>
        </div>
      </div>
    </section>
  );
}
