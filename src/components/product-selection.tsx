"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

// The colour chosen in the purchase panel, shared with the gallery next to it so
// choosing a colour shows that colour's photo.
interface ProductColor {
  color: string | null;
  setColor: (color: string | null) => void;
}

const ProductColorContext = createContext<ProductColor | null>(null);

export function ProductSelectionProvider({ children }: { children: ReactNode }) {
  const [color, setColor] = useState<string | null>(null);
  const value = useMemo(() => ({ color, setColor }), [color]);
  return (
    <ProductColorContext.Provider value={value}>
      {children}
    </ProductColorContext.Provider>
  );
}

// Outside a provider (a gallery or panel used alone) nothing is shared.
export function useProductColor(): ProductColor {
  return useContext(ProductColorContext) ?? { color: null, setColor: () => {} };
}
