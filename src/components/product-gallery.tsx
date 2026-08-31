"use client";

import { useState } from "react";
import type { ProductImage } from "@/types/catalog";
import { ProductMedia } from "./product-media";

interface ProductGalleryProps {
  images: ProductImage[];
  productName: string;
}

export function ProductGallery({ images, productName }: ProductGalleryProps) {
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [prevImages, setPrevImages] = useState(images);

  if (images !== prevImages) {
    setPrevImages(images);
    setSelectedImageIndex(0);
  }

  const safeIndex = selectedImageIndex < images.length ? selectedImageIndex : 0;
  const activeImage = images[safeIndex] ?? images[0];

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === "ArrowRight") {
      e.preventDefault();
      const nextIndex = (index + 1) % images.length;
      setSelectedImageIndex(nextIndex);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      const prevIndex = (index - 1 + images.length) % images.length;
      setSelectedImageIndex(prevIndex);
    }
  };

  return (
    <section aria-label={`${productName} gallery`} className="flex flex-col gap-4">
      {/* Primary Hero Image */}
      <div className="group relative aspect-[4/4] sm:aspect-[4/5] w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs transition duration-200 hover:shadow-md">
        <ProductMedia
          image={activeImage}
          productName={productName}
          priority
        />

        {images.length > 1 && (
          <div className="absolute bottom-3 right-3 rounded-full bg-slate-900/70 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur-xs">
            {safeIndex + 1} / {images.length}
          </div>
        )}
      </div>

      {/* Thumbnail Strip */}
      {images.length > 1 && (
        <div
          role="region"
          aria-label="Gallery thumbnails"
          className="flex items-center gap-3 overflow-x-auto pb-1"
        >
          {images.map((image, index) => {
            const isSelected = index === safeIndex;

            return (
              <button
                key={image.id || index}
                type="button"
                onClick={() => setSelectedImageIndex(index)}
                onKeyDown={(e) => handleKeyDown(e, index)}
                aria-label={`View ${image.altText || `${productName} photo ${index + 1}`}`}
                aria-pressed={isSelected}
                className={`relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border-2 bg-white transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800 ${
                  isSelected
                    ? "border-emerald-700 ring-2 ring-emerald-700/20 shadow-xs"
                    : "border-slate-200 opacity-75 hover:border-slate-400 hover:opacity-100"
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
