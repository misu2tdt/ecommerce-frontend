import type { Metadata } from "next";
import { FeedbackState } from "@/components/feedback-state";
import { ProductCard } from "@/components/product-card";
import { getProducts } from "@/features/catalog/api";
import { apiErrorMessage } from "@/lib/api";
import type { ProductSummary } from "@/types/catalog";

export const metadata: Metadata = {
  title: "Products",
  description: "Browse the current product catalog and variant price ranges.",
};

export const dynamic = "force-dynamic";

export default async function ProductsPage() {
  const result = await loadProducts();
  if ("error" in result) {
    return (
      <section className="mx-auto max-w-6xl px-6 py-16">
        <FeedbackState
          title="Catalog unavailable"
          description={result.error}
        />
      </section>
    );
  }

  const products = result.data;
  return (
    <section className="mx-auto max-w-6xl px-6 py-12 sm:py-16">
      <div className="mb-9">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-700">
          Catalog
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
          Products
        </h1>
        <p className="mt-3 max-w-2xl text-slate-600">
          Live prices, stock, and ratings from the local ecommerce backend.
        </p>
      </div>

      {products.length === 0 ? (
        <FeedbackState
          title="No products available"
          description="The catalog is empty. Run the backend demo seed and refresh this page."
        />
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </section>
  );
}

async function loadProducts(): Promise<
  { data: ProductSummary[] } | { error: string }
> {
  try {
    return { data: await getProducts() };
  } catch (error) {
    return { error: apiErrorMessage(error) };
  }
}
