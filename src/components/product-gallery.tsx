"use client";

import { useState } from "react";
import type { ProductImage } from "@/types/catalog";
import { ProductMedia } from "./product-media";

interface ProductGalleryProps {
  images: ProductImage[];
  productName: string;
}

export function ProductGallery({ images, productName }: ProductGalleryProps) {
  const [selectedImageId, setSelectedImageId] = useState(images[0]?.id);
  const selectedImage =
    images.find((image) => image.id === selectedImageId) ?? images[0];

  return (
    <section aria-label={`${productName} images`}>
      <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <ProductMedia
          image={selectedImage}
          productName={productName}
          priority
        />
      </div>

      {images.length > 1 && (
        <div className="mt-4 grid grid-cols-4 gap-3 sm:grid-cols-5">
          {images.map((image, index) => {
            const selected = image.id === selectedImage?.id;

            return (
              <button
                key={image.id}
                type="button"
                onClick={() => setSelectedImageId(image.id)}
                aria-label={`View ${image.altText || `${productName} image ${index + 1}`}`}
                aria-pressed={selected}
                className={`relative aspect-square overflow-hidden rounded-lg border-2 bg-white transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800 ${
                  selected
                    ? "border-emerald-700 shadow-sm"
                    : "border-slate-200 hover:border-slate-400"
                }`}
              >
                <ProductMedia image={image} productName={productName} />
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}
