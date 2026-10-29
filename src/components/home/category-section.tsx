import Image from "next/image";
import Link from "next/link";
import { Eyebrow } from "@/components/ui/eyebrow";
import { BANNERS } from "@/lib/banners";
import { CATEGORIES } from "@/lib/catalog-nav";

// Image cards, one link each, with the label under the picture.
//  - below md: a horizontal snap scroller, cards about 72% wide so the next one peeks in
//  - md (768-1023): 6 grid columns; three cards span 2 and the last two span 3,
//    so both rows are full
//  - lg and up: one row of five
export function CategorySection() {
  return (
    <section id="categories" className="py-14 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Eyebrow className="text-neutral-600">Browse</Eyebrow>
            <h2 className="mt-1 text-heading font-bold tracking-tight text-brand-strong">
              Shop by Category
            </h2>
          </div>
          <Link
            href="/products"
            className="text-body-sm font-bold text-brand transition hover:underline focus-visible:outline-2 focus-visible:outline-brand"
          >
            Browse all categories &rarr;
          </Link>
        </div>

        <ul className="-mx-4 mt-8 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none] sm:-mx-6 sm:scroll-px-6 sm:px-6 md:mx-0 md:grid md:grid-cols-6 md:gap-4 md:overflow-visible md:px-0 md:pb-0 lg:grid-cols-5">
          {CATEGORIES.map((category, index) => {
            const banner = BANNERS[category.bannerKey];
            return (
              <li
                key={category.slug}
                className={`w-[72%] shrink-0 snap-start md:w-auto ${
                  index < 3 ? "md:col-span-2" : "md:col-span-3"
                } lg:col-span-1`}
              >
                <Link
                  href={category.href}
                  className="group block focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand"
                >
                  <div className="relative aspect-[3/2] overflow-hidden rounded-md bg-surface-muted">
                    {/* Decorative: the label under it names the link. */}
                    <Image
                      src={banner.url}
                      alt=""
                      fill
                      sizes="(max-width: 767px) 72vw, (max-width: 1023px) 50vw, 20vw"
                      className="object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  </div>
                  <span className="mt-3 block text-body font-semibold text-brand-strong group-hover:underline">
                    {category.label}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
