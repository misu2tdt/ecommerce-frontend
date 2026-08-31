import { ProductCard } from "@/components/product-card";
import { getProducts } from "@/features/catalog/api";
import type { ProductSummary } from "@/types/catalog";

interface RelatedProductsProps {
  currentProductId: number;
  categorySlug: string;
  categoryName: string;
}

export async function RelatedProducts({
  currentProductId,
  categorySlug,
  categoryName,
}: RelatedProductsProps) {
  let related: ProductSummary[] = [];

  try {
    const products = await getProducts({ category: categorySlug });
    related = products
      .filter((product) => product.id !== currentProductId)
      .slice(0, 4);
  } catch {
    return null;
  }

  if (related.length === 0) return null;

  return (
    <section
      aria-labelledby="related-products-heading"
      className="mt-16 border-t border-slate-200 pt-12"
    >
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-800">
            Complete Your Rotation
          </p>
          <h2
            id="related-products-heading"
            className="mt-1 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl"
          >
            More in {categoryName}
          </h2>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {related.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  );
}
