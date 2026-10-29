import Image from "next/image";
import Link from "next/link";
import { buttonStyles } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/eyebrow";
import { BANNERS } from "@/lib/banners";

// Light, photo-first hero. On phones the picture comes first, then the text;
// from lg the text sits left and the picture right.
export function Hero() {
  const banner = BANNERS["banner-hero"];

  return (
    <section className="border-b border-line bg-surface py-12 sm:py-16 lg:py-20">
      <div className="mx-auto grid max-w-7xl items-center gap-8 px-4 sm:px-6 lg:grid-cols-2 lg:gap-12 lg:px-8">
        {/* The box reserves the space (3:2) and has a neutral colour, so nothing jumps while the picture loads. */}
        <div className="relative aspect-[3/2] overflow-hidden rounded-md bg-surface-muted lg:order-last">
          {/* Decorative: the text beside it carries the meaning. */}
          <Image
            src={banner.url}
            alt=""
            fill
            priority
            sizes="(max-width: 1024px) 100vw, 50vw"
            className="object-cover"
          />
        </div>

        <div>
          <Eyebrow className="text-neutral-600">
            Curated Fashion Catalog • Live Inventory
          </Eyebrow>
          <h1 className="mt-4 font-bold tracking-tight text-brand-strong text-display">
            Built for Every Day.
            <br />
            <span className="text-neutral-600">Engineered for Comfort.</span>
          </h1>
          <p className="mt-6 max-w-xl text-body text-neutral-600 sm:text-title">
            Discover contemporary essentials crafted with breathable natural
            fibers, minimalist silhouettes, and technical durability for work,
            movement, and rest.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3 sm:gap-4">
            <Link
              href="/products"
              className={buttonStyles({ variant: "primary", size: "lg" })}
            >
              Shop All Products
            </Link>
            <Link
              href="#categories"
              className={buttonStyles({ variant: "secondary", size: "lg" })}
            >
              Explore Categories
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
