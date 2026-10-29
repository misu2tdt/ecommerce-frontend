import Image from "next/image";
import Link from "next/link";
import { buttonStyles } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/eyebrow";
import { BANNERS } from "@/lib/banners";

// Photo hero.
//  - below lg: the picture on top (garments fully visible), the text below it
//    on the white page
//  - lg and up: the text sits on the photo's empty navy half. The picture is
//    sized by the hero's height, not its width, so the garments are never
//    cropped (they fill about 90% of the photo's height), and it is anchored
//    right. The hero's navy colour continues to its left, and a fade hides the
//    picture's left edge. A left-to-right scrim keeps the text readable even on
//    a lighter photo, and the navy alone is enough if the picture never loads.
export function Hero() {
  const banner = BANNERS["banner-hero-wide"];

  return (
    <section className="relative isolate overflow-hidden border-b border-line bg-surface lg:h-140 lg:border-b-0 lg:bg-hero xl:h-160">
      {/* The box reserves the space, so nothing jumps while the picture loads. */}
      <div className="relative aspect-square w-full bg-hero sm:aspect-[3/2] lg:absolute lg:inset-y-0 lg:right-0 lg:aspect-video lg:h-full lg:w-auto">
        {/* Decorative: the text carries the meaning. */}
        <Image
          src={banner.url}
          alt=""
          fill
          priority
          sizes="(max-width: 1023px) 100vw, 1140px"
          className="object-cover object-right"
        />
        {/* Fades the picture's left edge into the hero colour. */}
        <div
          aria-hidden="true"
          className="absolute inset-y-0 left-0 hidden w-2/5 bg-linear-to-r from-hero via-hero/70 to-transparent lg:block"
        />
      </div>

      {/* Dark left-to-right scrim behind the text. */}
      <div
        aria-hidden="true"
        className="absolute inset-y-0 left-0 hidden w-1/2 bg-linear-to-r from-hero via-hero/80 to-transparent lg:block"
      />

      <div className="relative mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-12 lg:flex lg:h-full lg:items-center lg:px-8 lg:py-0">
        <div className="lg:max-w-sm xl:max-w-xl">
          <Eyebrow className="text-neutral-600 lg:text-white">
            Curated Fashion Catalog • Live Inventory
          </Eyebrow>
          <h1 className="mt-4 font-bold tracking-tight text-brand-strong text-display lg:text-white">
            Built for Every Day.
            <br />
            <span className="text-neutral-600 lg:text-white">
              Engineered for Comfort.
            </span>
          </h1>
          <p className="mt-6 max-w-xl text-body text-neutral-600 sm:text-title lg:text-body lg:text-white xl:text-title">
            Discover contemporary essentials crafted with breathable natural
            fibers, minimalist silhouettes, and technical durability for work,
            movement, and rest.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3 sm:gap-4">
            <Link
              href="/products"
              className={buttonStyles({ variant: "heroPrimary", size: "lg" })}
            >
              Shop All Products
            </Link>
            <Link
              href="#categories"
              className={buttonStyles({ variant: "heroSecondary", size: "lg" })}
            >
              Explore Categories
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
