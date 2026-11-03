import type { MetadataRoute } from "next";
import { getSiteUrl, PRIVATE_PATHS } from "@/lib/seo";

// The shop is open to crawlers; the pages that belong to one visitor or to the
// staff are not.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: [...PRIVATE_PATHS] }],
    sitemap: `${getSiteUrl()}/sitemap.xml`,
  };
}
