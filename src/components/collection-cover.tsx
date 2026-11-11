import Image from "next/image";
import { isHttpImageUrl, isOptimizableImageUrl } from "@/lib/image-url";

// The cover picture of a collection, filling its (relatively positioned) parent.
// The picture is decorative: the collection's name is always next to it. With no
// picture, or one that cannot be used, a neutral placeholder is shown instead.
export function CollectionCover({
  url,
  priority,
  sizes,
}: {
  url: string | null;
  priority?: boolean;
  sizes: string;
}) {
  if (url && isHttpImageUrl(url)) {
    return (
      <Image
        src={url}
        alt=""
        fill
        priority={priority}
        sizes={sizes}
        unoptimized={!isOptimizableImageUrl(url)}
        className="object-cover"
      />
    );
  }

  return (
    <div
      aria-hidden="true"
      className="flex h-full w-full items-center justify-center bg-gradient-to-br from-neutral-50 to-neutral-100 text-brand-strong/45"
    >
      <svg aria-hidden="true" viewBox="0 0 64 64" className="h-16 w-16" fill="none">
        <rect x="8" y="12" width="48" height="40" rx="6" stroke="currentColor" strokeWidth="3" />
        <circle cx="23" cy="27" r="5" stroke="currentColor" strokeWidth="3" />
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
