// Editorial banner photos (landscape 3:2) used on the home page.
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
    url: `${BASE}/v1793209475/evergreen/demo/banner-hero.png`,
    width: 1536,
    height: 1024,
  },
  "category-t-shirts-tops": {
    url: `${BASE}/v1793209478/evergreen/demo/category-t-shirts-tops.png`,
    width: 1536,
    height: 1024,
  },
  "category-shirts-polos": {
    url: `${BASE}/v1793209478/evergreen/demo/category-shirts-polos.png`,
    width: 1536,
    height: 1024,
  },
  "category-hoodies-outerwear": {
    url: `${BASE}/v1793209477/evergreen/demo/category-hoodies-outerwear.png`,
    width: 1536,
    height: 1024,
  },
  "category-pants-shorts": {
    url: `${BASE}/v1793209478/evergreen/demo/category-pants-shorts.png`,
    width: 1536,
    height: 1024,
  },
  "category-basics-accessories": {
    url: `${BASE}/v1793209477/evergreen/demo/category-basics-accessories.png`,
    width: 1536,
    height: 1024,
  },
  "brand-monolith-studio": {
    url: `${BASE}/v1793209476/evergreen/demo/brand-monolith-studio.png`,
    width: 1536,
    height: 1024,
  },
  "brand-veloce-active": {
    url: `${BASE}/v1793209476/evergreen/demo/brand-veloce-active.png`,
    width: 1536,
    height: 1024,
  },
} as const satisfies Record<string, Banner>;

export type BannerKey = keyof typeof BANNERS;
