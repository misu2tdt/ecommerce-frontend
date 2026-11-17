import Image from "next/image";
import Link from "next/link";
import { Eyebrow } from "@/components/ui/eyebrow";
import { loadNavCatalog } from "@/features/catalog/nav";
import { BANNERS, type BannerKey } from "@/lib/banners";
import type { NavBrand } from "@/lib/catalog-nav";

// The brands with editorial pictures, in display order. Name and link come from
// the shared brand list; the words below are this section's own. A brand is shown
// only when the shop has it (see loadNavCatalog), so the same page serves the two
// brands of the base seed and the four that the catalog expansion adds.
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
  {
    slug: "ardent-motion",
    banner: "brand-ardent-motion",
    subtitle: "Seamless Training Wear",
    description:
      "Seamless, supportive activewear for the studio, the gym and the street.",
    cta: "Explore Ardent Motion",
  },
  {
    slug: "hushwell",
    banner: "brand-hushwell",
    subtitle: "Soft Knits, Calm Shapes",
    description:
      "Loungewear and sleepwear in soft knits and breathable cotton, cut in calm, easy shapes.",
    cta: "Explore Hushwell",
  },
  {
    slug: "tidewell",
    banner: "brand-tidewell",
    subtitle: "Built for Rainy Days",
    description:
      "Quick-dry fabrics, sealed seams and packable shells for rainy days and humid commutes.",
    cta: "Explore Tidewell",
  },
  {
    slug: "cinder-oak",
    banner: "brand-cinder-oak",
    subtitle: "Heritage Casualwear",
    description:
      "Sturdy cotton, canvas and denim, finished to look better with wear.",
    cta: "Explore Cinder & Oak",
  },
];

export async function BrandSection() {
  const { brands } = await loadNavCatalog();
  return <BrandCards brands={brands} />;
}

// An odd last card is centred under the pair above it, at the width of one
// column, instead of sitting alone at the left of the row (from md, where the
// grid has two columns).
const ODD_LAST =
  "md:[&:last-child:nth-child(odd)]:col-span-2 md:[&:last-child:nth-child(odd)]:w-[calc(50%-0.75rem)] md:[&:last-child:nth-child(odd)]:justify-self-center";

export function BrandCards({ brands }: { brands: readonly NavBrand[] }) {
  const shown = EDITS.flatMap((edit) => {
    const brand = brands.find((item) => item.slug === edit.slug);
    return brand ? [{ edit, brand }] : [];
  });
  if (shown.length === 0) return null;

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
          {shown.map(({ edit, brand }) => {
            const banner = BANNERS[edit.banner];
            return (
              <li key={edit.slug} className={`group relative ${ODD_LAST}`}>
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
