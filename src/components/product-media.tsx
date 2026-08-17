import Image from "next/image";
import type { ProductImage } from "@/types/catalog";

interface ProductMediaProps {
  image?: ProductImage;
  productName: string;
  priority?: boolean;
}

export function ProductMedia({
  image,
  productName,
  priority,
}: ProductMediaProps) {
  if (image) {
    return (
      <Image
        src={image.url}
        alt={image.altText || productName}
        fill
        priority={priority}
        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        className="object-cover"
      />
    );
  }

  return (
    <div
      role="img"
      aria-label={`No image available for ${productName}`}
      className="flex h-full min-h-52 items-center justify-center bg-gradient-to-br from-emerald-50 to-slate-100 text-emerald-900/45"
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 64 64"
        className="h-16 w-16"
        fill="none"
      >
        <rect
          x="8"
          y="12"
          width="48"
          height="40"
          rx="6"
          stroke="currentColor"
          strokeWidth="3"
        />
        <circle
          cx="23"
          cy="27"
          r="5"
          stroke="currentColor"
          strokeWidth="3"
        />
        <path
          d="m13 47 13-12 9 8 7-6 9 10"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}
