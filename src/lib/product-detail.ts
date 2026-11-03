import type { ProductImage } from "@/types/catalog";

// From this many units down, the page says how many are left. Above it the page
// says nothing: a big number is not useful and pressures nobody.
export const LOW_STOCK_THRESHOLD = 5;

// The note next to a size or colour about its stock, from the real number the
// backend gives; null while there is plenty.
export function stockHint(stock: number): string | null {
  if (stock <= 0) return "Sold out";
  if (stock <= LOW_STOCK_THRESHOLD) return `Only ${stock} left`;
  return null;
}

// The product's photos are named "<product> in <colour>" (the catalog's alt text
// convention). Returns the index of the photo of a colour, or -1 when no photo is
// for it (then the gallery stays where it is).
export function imageIndexForColor(
  images: Array<Pick<ProductImage, "altText">>,
  color: string | null,
): number {
  const wanted = color?.trim().toLowerCase();
  if (!wanted) return -1;
  return images.findIndex((image) => {
    const alt = image.altText?.trim().toLowerCase() ?? "";
    return alt.endsWith(` in ${wanted}`);
  });
}
