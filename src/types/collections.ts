// A collection is a curated, ordered group of products ("Everyday Essentials").
// These are the shapes the backend's /collections and /admin/collections routes
// return (see docs/collections.md in the backend repo).

// What a shopper may see. `productCount` counts the products a shopper can buy.
export interface Collection {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  heroImageUrl: string | null;
  isFeatured: boolean;
  productCount: number;
}

// A collection as staff see it: inactive ones included, with its own counts.
export interface AdminCollection extends Omit<Collection, "productCount"> {
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  // Every product in the collection, hidden ones included.
  productCount: number;
  // The products shoppers see: active, with at least one active variant.
  visibleProductCount: number;
}

// One product of a collection, in display order, whatever its status.
export interface AdminCollectionProduct {
  id: number;
  name: string;
  slug: string;
  status: "active" | "inactive";
  position: number;
}

export interface AdminCollectionDetail extends AdminCollection {
  products: AdminCollectionProduct[];
}

export interface CreateCollectionInput {
  name: string;
  slug?: string;
  description?: string | null;
  heroImageUrl?: string | null;
  isActive?: boolean;
  isFeatured?: boolean;
  sortOrder?: number;
}

export type UpdateCollectionInput = Partial<CreateCollectionInput>;
