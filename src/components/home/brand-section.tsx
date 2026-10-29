import Image from "next/image";
import Link from "next/link";
import { Eyebrow } from "@/components/ui/eyebrow";
import { BANNERS, type BannerKey } from "@/lib/banners";
import { BRANDS } from "@/lib/catalog-nav";

// The two brands with editorial pictures. Name and link come from the shared
// brand list; the words below are this section's own.
const EDITS: Array<{
  slug: string;
  banner: BannerKey;
  subtitle: string;
  description: string;
  cta: string;
}> = [
  {
    slug: "veloce-active",
    banner: "brand-veloce-active",
    subtitle: "High-Performance Motion",
    description:
      "Breathable mesh singlets, 7-inch training shorts, and weather-resistant packable trail windbreakers engineered for movement.",
    cta: "Explore Veloce Active",
  },
  {
    slug: "monolith-studio",
    banner: "brand-monolith-studio",
    subtitle: "Contemporary Structured Tailoring",
    description:
      "Heavyweight overshirts, utility cargo shorts, and tailored pleated trousers designed for clean, intentional everyday silhouettes.",
    cta: "Explore Monolith Studio",
  },
];

export function BrandSection() {
  return (
    <section className="py-14 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <Eyebrow className="text-neutral-600">Our brands</Eyebrow>
          <h2 className="mt-1 text-heading font-bold tracking-tight text-brand-strong">
            Brand Collections
          </h2>
        </div>

        <ul className="grid grid-cols-1 gap-8 md:grid-cols-2 md:gap-6">
          {EDITS.map((edit) => {
            const brand = BRANDS.find((item) => item.slug === edit.slug)!;
            const banner = BANNERS[edit.banner];
            return (
              <li key={edit.slug} className="group relative">
                <div className="relative aspect-[3/2] overflow-hidden rounded-md bg-surface-muted">
                  {/* Decorative: the heading link below names the card. */}
                  <Image
                    src={banner.url}
                    alt=""
                    fill
                    sizes="(max-width: 767px) 100vw, 50vw"
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                </div>
                <div className="mt-4">
                  <p className="text-body-sm font-semibold text-neutral-600">
                    {edit.subtitle}
                  </p>
                  <h3 className="mt-1 text-heading font-bold tracking-tight text-brand-strong">
                    {/* The card's one link: its ::after stretches over the whole card. */}
                    <Link
                      href={brand.href}
                      className="after:absolute after:inset-0 focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-offset-2 focus-visible:after:outline-brand"
                    >
                      {brand.label}
                    </Link>
                  </h3>
                  <p className="mt-2 max-w-md text-body-sm text-neutral-600 sm:text-body">
                    {edit.description}
                  </p>
                  <span
                    aria-hidden="true"
                    className="mt-3 inline-block text-body-sm font-semibold text-brand group-hover:underline"
                  >
                    {edit.cta} &rarr;
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
