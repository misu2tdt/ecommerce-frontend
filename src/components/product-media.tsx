import Image from "next/image";
import type { ProductImage } from "@/types/catalog";
import { cx } from "./ui/cx";

interface ProductMediaProps {
  image?: ProductImage | { url: string; altText: string | null };
  productName: string;
  priority?: boolean;
  sizes?: string;
  // The picture sits next to a link that already names the product, so the
  // "no image" placeholder is hidden from assistive technology.
  decorative?: boolean;
  imageClassName?: string;
}

export function ProductMedia({
  image,
  productName,
  priority,
  sizes = "(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw",
  decorative = false,
  imageClassName,
}: ProductMediaProps) {
  if (image) {
    return (
      <Image
        src={image.url}
        alt={image.altText || productName}
        fill
        priority={priority}
        sizes={sizes}
        className={cx("object-cover", imageClassName)}
      />
    );
  }

  return (
    <div
      {...(decorative
        ? { "aria-hidden": true }
        : { role: "img", "aria-label": `No image available for ${productName}` })}
      className={cx(
        "flex h-full items-center justify-center bg-gradient-to-br from-neutral-50 to-neutral-100 text-brand-strong/45",
        !decorative && "min-h-52",
      )}
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
