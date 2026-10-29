import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";
import {
  buildProductsQuery,
  getProducts,
  PRODUCT_QUERY_PARAMS,
  type ProductFilters,
} from "@/features/catalog/api";
import { VALID_SORTS } from "@/features/catalog/search-params";

// The backend rejects any query parameter it does not know with a 400 (global
// ValidationPipe, forbidNonWhitelisted). This is a second, independent copy of
// what ProductQueryDto in the backend repo accepts: if the backend gains or
// loses a parameter, both copies have to change on purpose.
const BACKEND_ACCEPTS = [
  "category",
  "brand",
  "q",
  "size",
  "color",
  "minPrice",
  "maxPrice",
  "inStock",
  "sort",
];
const BACKEND_SORTS = [
  "featured",
  "price_asc",
  "price_desc",
  "name_asc",
  "name_desc",
  "newest",
];

const EVERY_FILTER: ProductFilters = {
  q: "tee",
  category: "t-shirts-tops",
  brand: "aerothread",
  size: ["M", "L"],
  color: ["Black"],
  minPrice: 100000,
  maxPrice: 500000,
  inStock: true,
  sort: "price_asc",
};

// Runs a call with fetch replaced and returns the URL it asked for.
async function requestedUrl(call: () => Promise<unknown>): Promise<URL> {
  const originalFetch = globalThis.fetch;
  const originalBase = process.env.NEXT_PUBLIC_API_BASE_URL;
  process.env.NEXT_PUBLIC_API_BASE_URL = "http://localhost:3000";
  let url: URL | undefined;
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    url = new URL(String(input));
    return new Response("[]", {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }) as typeof fetch;
  try {
    await call();
  } finally {
    globalThis.fetch = originalFetch;
    process.env.NEXT_PUBLIC_API_BASE_URL = originalBase;
  }
  return url!;
}

function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(full);
    return /\.(ts|tsx)$/.test(entry.name) ? [full] : [];
  });
}

test.describe("the products request only uses parameters the backend accepts", () => {
  test("the home page request (no filters) is a plain GET /products", async () => {
    const url = await requestedUrl(() => getProducts());

    expect(url.pathname).toBe("/products");
    expect([...url.searchParams.keys()]).toEqual([]);
  });

  test("with every filter set, each parameter is one the backend accepts", async () => {
    const url = await requestedUrl(() => getProducts(EVERY_FILTER));
    const sent = [...new Set(url.searchParams.keys())].sort();

    expect(sent).toEqual([...BACKEND_ACCEPTS].sort());
    expect(url.searchParams.getAll("size")).toEqual(["M", "L"]);
    expect(url.searchParams.get("inStock")).toBe("true");
  });

  test("the allow-list in the frontend matches the backend's", () => {
    expect([...PRODUCT_QUERY_PARAMS].sort()).toEqual([...BACKEND_ACCEPTS].sort());
  });

  test("a pagination parameter can never be sent, even if one is passed in", async () => {
    const sneaky = { ...EVERY_FILTER, limit: 8, page: 1, offset: 0 };
    const query = buildProductsQuery(sneaky as ProductFilters);
    const url = await requestedUrl(() => getProducts(sneaky as ProductFilters));

    for (const name of ["limit", "page", "offset", "perPage"]) {
      expect(Object.keys(query)).not.toContain(name);
      expect(url.searchParams.has(name)).toBe(false);
    }
  });

  test("every sort value the frontend can send is one the backend accepts", async () => {
    expect([...VALID_SORTS].sort()).toEqual([...BACKEND_SORTS].sort());
    for (const sort of VALID_SORTS) {
      const url = await requestedUrl(() => getProducts({ sort }));
      expect(BACKEND_SORTS).toContain(url.searchParams.get("sort"));
    }
  });

  test("no page asks the products API for a limit or a page in its source", () => {
    const offenders: string[] = [];
    for (const file of sourceFiles(path.resolve(process.cwd(), "src"))) {
      const source = readFileSync(file, "utf8");
      const relative = path.relative(process.cwd(), file).replaceAll("\\", "/");
      // getProducts({ ... limit: 8 }) or a hand-written /products?limit=8
      if (/getProducts\(\s*\{[^}]*\b(limit|page|offset|perPage)\b/.test(source)) {
        offenders.push(`${relative}: getProducts with a pagination key`);
      }
      if (/\/products\?[^"'`\s]*\b(limit|page|offset|perPage)=/.test(source)) {
        offenders.push(`${relative}: /products URL with a pagination parameter`);
      }
    }
    expect(offenders).toEqual([]);
  });
});
