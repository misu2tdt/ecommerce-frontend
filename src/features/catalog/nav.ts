import { resolveNavCatalog, type NavCatalog } from "@/lib/catalog-nav";
import { getNavBrands, getNavCategories } from "./api";

interface Loaders {
  categories: () => Promise<unknown>;
  brands: () => Promise<unknown>;
}

// The slugs of a list answer, or null when the answer is not usable: the request
// failed, or an older or broken backend sent something that is not a list.
function slugsOf(result: PromiseSettledResult<unknown>): string[] | null {
  if (result.status !== "fulfilled" || !Array.isArray(result.value)) return null;
  return result.value.flatMap((row: unknown) =>
    row && typeof (row as { slug?: unknown }).slug === "string"
      ? [(row as { slug: string }).slug]
      : [],
  );
}

// The categories and brands the menus, the footer and the home page show: the
// ones with a presentation (lib/catalog-nav) that the API says exist. The two
// lists are asked for apart, so one failing does not hide the other; a failed one
// falls back to the base seed's entries. The default loaders keep their answer
// for a minute (see getNavCategories).
export async function loadNavCatalog(
  loaders: Loaders = { categories: getNavCategories, brands: getNavBrands },
): Promise<NavCatalog> {
  const [categories, brands] = await Promise.allSettled([
    loaders.categories(),
    loaders.brands(),
  ]);
  return resolveNavCatalog({
    categories: slugsOf(categories),
    brands: slugsOf(brands),
  });
}
