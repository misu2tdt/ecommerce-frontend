import { expect, test } from "@playwright/test";
import { imageIndexForColor, stockHint, LOW_STOCK_THRESHOLD } from "@/lib/product-detail";
import { productJsonLd } from "@/lib/seo";

const images = [
  { url: "https://img.test/black.jpg", altText: "Classic Tee in Black" },
  { url: "https://img.test/white.jpg", altText: "Classic Tee in White" },
  { url: "https://img.test/navy.jpg", altText: "Classic Tee in Navy Blue" },
  { url: "https://img.test/extra.jpg", altText: null },
];

test.describe("imageIndexForColor", () => {
  test("finds the photo of the chosen colour", () => {
    expect(imageIndexForColor(images, "Black")).toBe(0);
    expect(imageIndexForColor(images, "White")).toBe(1);
    expect(imageIndexForColor(images, "Navy Blue")).toBe(2);
  });

  test("ignores case and surrounding spaces", () => {
    expect(imageIndexForColor(images, " navy blue ")).toBe(2);
  });

  test("matches the whole colour name, not the end of another", () => {
    expect(imageIndexForColor(images, "Blue")).toBe(-1);
  });

  test("says there is none when no photo is for that colour", () => {
    expect(imageIndexForColor(images, "Red")).toBe(-1);
    expect(imageIndexForColor(images, null)).toBe(-1);
    expect(imageIndexForColor([], "Black")).toBe(-1);
  });
});

test.describe("stockHint", () => {
  test("says nothing while there is plenty", () => {
    expect(stockHint(LOW_STOCK_THRESHOLD + 1)).toBeNull();
    expect(stockHint(120)).toBeNull();
  });

  test("warns when only a few are left, with the real number", () => {
    expect(stockHint(LOW_STOCK_THRESHOLD)).toBe(`Only ${LOW_STOCK_THRESHOLD} left`);
    expect(stockHint(1)).toBe("Only 1 left");
  });

  test("says it is sold out at zero", () => {
    expect(stockHint(0)).toBe("Sold out");
  });
});

test.describe("productJsonLd", () => {
  const product = {
    name: "Classic Tee",
    slug: "classic-tee",
    description: "Soft cotton.",
    brand: { name: "AeroThread" },
    images,
    minPrice: 199000,
    maxPrice: 199000,
    variants: [{ stock: 5 }, { stock: 0 }],
  };

  test("is valid JSON made only of what the product has", () => {
    const text = productJsonLd(product, "https://shop.test");
    const data = JSON.parse(text) as Record<string, unknown>;

    expect(data["@context"]).toBe("https://schema.org");
    expect(data["@type"]).toBe("Product");
    expect(data.name).toBe("Classic Tee");
    expect(data.description).toBe("Soft cotton.");
    expect(data.brand).toEqual({ "@type": "Brand", name: "AeroThread" });
    expect(data.image).toEqual([
      "https://img.test/black.jpg",
      "https://img.test/white.jpg",
      "https://img.test/navy.jpg",
      "https://img.test/extra.jpg",
    ]);
    expect(data.offers).toEqual({
      "@type": "Offer",
      url: "https://shop.test/products/classic-tee",
      price: 199000,
      priceCurrency: "VND",
      availability: "https://schema.org/InStock",
    });
  });

  test("never invents ratings, reviews, SKUs or identifiers", () => {
    const keys = Object.keys(JSON.parse(productJsonLd(product, "https://shop.test")));
    for (const invented of ["aggregateRating", "review", "sku", "gtin", "mpn"]) {
      expect(keys).not.toContain(invented);
    }
  });

  test("a price range becomes an aggregate offer", () => {
    const data = JSON.parse(
      productJsonLd({ ...product, minPrice: 100000, maxPrice: 150000 }, "https://shop.test"),
    ) as { offers: Record<string, unknown> };

    expect(data.offers).toMatchObject({
      "@type": "AggregateOffer",
      lowPrice: 100000,
      highPrice: 150000,
      priceCurrency: "VND",
      offerCount: 2,
    });
  });

  test("availability follows the real stock", () => {
    const soldOut = JSON.parse(
      productJsonLd({ ...product, variants: [{ stock: 0 }, { stock: 0 }] }, "https://shop.test"),
    ) as { offers: { availability: string } };

    expect(soldOut.offers.availability).toBe("https://schema.org/OutOfStock");
  });

  test("leaves out what is missing instead of guessing", () => {
    const data = JSON.parse(
      productJsonLd(
        { ...product, description: null, brand: null, images: [], minPrice: null, maxPrice: null },
        "https://shop.test",
      ),
    ) as Record<string, unknown>;

    expect(data).not.toHaveProperty("description");
    expect(data).not.toHaveProperty("brand");
    expect(data).not.toHaveProperty("image");
    expect(data).not.toHaveProperty("offers");
  });

  test("cannot close the script tag it sits in", () => {
    const text = productJsonLd(
      { ...product, name: "</script><script>alert(1)</script>" },
      "https://shop.test",
    );

    expect(text).not.toContain("</script>");
    expect(JSON.parse(text).name).toBe("</script><script>alert(1)</script>");
  });
});
