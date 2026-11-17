// Editorial banner photos used on the home page. Most are landscape 3:2;
// banner-hero-wide is 16:9 (1672x941). The banner-collection-* pictures are not
// here: a collection's picture is its own heroImageUrl, which the API returns.
//
// Copied from the banner entries of the backend's demo-images.json
// (ecommerce-backend/src/database/seeds/demo-images.json), which the backend's
// `npm run images:upload` writes. Only public Cloudinary urls and sizes are
// copied: the frontend never reads the backend repo. Re-copy these values if
// the banners are uploaded again (the /v<number>/ part of each url changes).

export interface Banner {
  url: string;
  width: number;
  height: number;
}

const BASE = "https://res.cloudinary.com/s0iqplop/image/upload";

export const BANNERS = {
  "banner-hero": {
    url: `${BASE}/v1793215356/evergreen/demo/banner-hero.png`,
    width: 1536,
    height: 1024,
  },
  "banner-hero-wide": {
    url: `${BASE}/v1793215356/evergreen/demo/banner-hero-wide.png`,
    width: 1672,
    height: 941,
  },
  "category-t-shirts-tops": {
    url: `${BASE}/v1793215360/evergreen/demo/category-t-shirts-tops.png`,
    width: 1536,
    height: 1024,
  },
  "category-shirts-polos": {
    url: `${BASE}/v1793215359/evergreen/demo/category-shirts-polos.png`,
    width: 1536,
    height: 1024,
  },
  "category-hoodies-outerwear": {
    url: `${BASE}/v1793215358/evergreen/demo/category-hoodies-outerwear.png`,
    width: 1536,
    height: 1024,
  },
  "category-pants-shorts": {
    url: `${BASE}/v1793215359/evergreen/demo/category-pants-shorts.png`,
    width: 1536,
    height: 1024,
  },
  "category-basics-accessories": {
    url: `${BASE}/v1793215358/evergreen/demo/category-basics-accessories.png`,
    width: 1536,
    height: 1024,
  },
  // Added with the catalog expansion (two categories, four brands). These come
  // from the later upload, so their version numbers differ from the ones above.
  "category-activewear": {
    url: `${BASE}/v1794909338/evergreen/demo/category-activewear.jpg`,
    width: 1536,
    height: 1024,
  },
  "category-loungewear-sleepwear": {
    url: `${BASE}/v1794909340/evergreen/demo/category-loungewear-sleepwear.jpg`,
    width: 1536,
    height: 1024,
  },
  "brand-monolith-studio": {
    url: `${BASE}/v1793215357/evergreen/demo/brand-monolith-studio.png`,
    width: 1536,
    height: 1024,
  },
  "brand-veloce-active": {
    url: `${BASE}/v1793215358/evergreen/demo/brand-veloce-active.png`,
    width: 1536,
    height: 1024,
  },
  "brand-ardent-motion": {
    url: `${BASE}/v1794909333/evergreen/demo/brand-ardent-motion.jpg`,
    width: 1536,
    height: 1024,
  },
  "brand-cinder-oak": {
    url: `${BASE}/v1794909334/evergreen/demo/brand-cinder-oak.jpg`,
    width: 1536,
    height: 1024,
  },
  "brand-hushwell": {
    url: `${BASE}/v1794909335/evergreen/demo/brand-hushwell.jpg`,
    width: 1536,
    height: 1024,
  },
  "brand-tidewell": {
    url: `${BASE}/v1794909338/evergreen/demo/brand-tidewell.jpg`,
    width: 1536,
    height: 1024,
  },
} as const satisfies Record<string, Banner>;

export type BannerKey = keyof typeof BANNERS;
