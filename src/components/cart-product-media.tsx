import Image from "next/image";
import { ProductMedia } from "./product-media";

export function CartProductMedia({
  imageUrl,
  productName,
}: {
  imageUrl: string | null;
  productName: string;
}) {
  if (!imageUrl) return <ProductMedia productName={productName} />;

  return (
    <Image
      src={imageUrl}
      alt={productName}
      fill
      sizes="(max-width: 640px) 96px, 128px"
      className="object-cover"
    />
  );
}
