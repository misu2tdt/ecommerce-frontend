import type { VndAmount } from "./catalog";

export interface WishlistItem {
  id: number;
  createdAt: string;
  product: {
    id: number;
    name: string;
    slug: string;
    status: "active" | "inactive";
    available: boolean;
    category: { id: number; name: string; slug: string };
    brand: { id: number; name: string; slug: string } | null;
    primaryImage: { url: string; altText: string | null } | null;
    minPrice: VndAmount | null;
    maxPrice: VndAmount | null;
    inStock: boolean;
    averageRating: number | null;
    reviewCount: number;
  };
}
