import { cache } from "react";
import { ProductCard } from "@/components/product-card";
import { ProductGrid } from "@/components/product-grid";
import { getProductsPage } from "@/features/catalog/api";
import type { ProductSummary } from "@/types/catalog";

import { Eyebrow } from "@/components/ui/eyebrow";
interface RelatedProductsProps {
  currentProductId: number;
  categorySlug: string;
  categoryName: string;
}

// Four other products of the category, or null when the request fails. The result
// is kept for the render: the product page starts it early (preloadRelatedProducts)
// so it runs beside the reviews, and the section below picks up the same answer.
const loadRelatedProducts = cache(
  async (
    categorySlug: string,
    currentProductId: number,
  ): Promise<ProductSummary[] | null> => {
    try {
      // One page of the category (12) is plenty for four other products.
      const { items: products } = await getProductsPage(
        { category: categorySlug },
        1,
      );
      return products
        .filter((product) => product.id !== currentProductId)
        .slice(0, 4);
    } catch {
      return null;
    }
  },
);

// Starts the request without waiting for it. It never rejects, so nothing is lost
// if the section is not rendered.
export function preloadRelatedProducts(
  categorySlug: string,
  currentProductId: number,
): void {
  void loadRelatedProducts(categorySlug, currentProductId);
}

export async function RelatedProducts({
  currentProductId,
  categorySlug,
  categoryName,
}: RelatedProductsProps) {
  const related = await loadRelatedProducts(categorySlug, currentProductId);
  if (!related || related.length === 0) return null;

  return (
    <section
      aria-labelledby="related-products-heading"
      className="mt-16 border-t border-line pt-12"
    >
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Eyebrow>
            Complete Your Rotation
          </Eyebrow>
          <h2
            id="related-products-heading"
            className="mt-1 text-heading font-bold tracking-tight text-brand-strong"
          >
            More in {categoryName}
          </h2>
        </div>
      </div>

      <ProductGrid className="mt-8">
        {related.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </ProductGrid>
    </section>
  );
}
