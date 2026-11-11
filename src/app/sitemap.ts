import type { MetadataRoute } from "next";
import { getAllProductSlugs } from "@/features/catalog/api";
import { getAllCollectionSlugs } from "@/features/collections/api";
import {
  getSiteUrl,
  sitemapEntries,
  type SitemapCollection,
  type SitemapProduct,
} from "@/lib/seo";

// Built when it is asked for, never at build time: the build has to work with no
// backend running, and a sitemap made while the backend was down would be cached.
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  let products: SitemapProduct[] = [];
  let collections: SitemapCollection[] = [];
  try {
    products = await getAllProductSlugs();
  } catch {
    // The backend is not reachable: list the fixed pages only.
  }
  try {
    collections = await getAllCollectionSlugs();
  } catch {
    // No collections (or a backend that has none yet): the other pages stay.
  }
  return sitemapEntries(getSiteUrl(), products, collections);
}
