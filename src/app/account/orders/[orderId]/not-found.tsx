import Link from "next/link";

export default function OrderNotFound() {
  return (
    <section className="mx-auto max-w-3xl px-6 py-16">
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-2xl font-bold text-slate-950">Order not found</h1>
        <p className="mt-3 text-slate-600">
          This Order does not exist or is not available for the authenticated
          account.
        </p>
        <Link
          href="/account/orders"
          className="mt-6 inline-flex min-h-11 items-center justify-center rounded-lg border border-emerald-800 px-4 py-2 font-semibold text-emerald-800 hover:bg-emerald-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800"
        >
          View all Orders
        </Link>
      </div>
    </section>
  );
}
