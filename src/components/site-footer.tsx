import Link from "next/link";
import { Eyebrow } from "@/components/ui/eyebrow";
import { FOOTER_BRANDS, FOOTER_CATEGORIES } from "@/lib/catalog-nav";
import { SITE_NAME } from "@/lib/site";

const customerLinks = [
  { label: "My Account", href: "/account" },
  { label: "Order History", href: "/account/orders" },
  { label: "Shopping Bag", href: "/cart" },
  { label: "Saved Wishlist", href: "/wishlist" },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-line bg-brand-strong text-neutral-400">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4 lg:gap-12">
          {/* Col 1: Brand Info */}
          <div className="col-span-2 md:col-span-1">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-body font-bold tracking-tight text-white focus-visible:outline-2 focus-visible:outline-white"
            >
              <span className="tracking-widest">VERVE</span>
              <span className="text-body-sm font-semibold tracking-widest text-neutral-400">STUDIO</span>
            </Link>
            <p className="mt-3 text-body-sm text-neutral-400">
              Modern commercial fashion storefront engineered for comfort,
              movement, and everyday utility. Powered by Next.js and NestJS.
            </p>
            <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-neutral-800 bg-brand px-3 py-1 text-body-sm font-semibold text-neutral-300">
              <span className="h-1.5 w-1.5 rounded-full bg-neutral-400" />
              <span>Live Fashion Catalog</span>
            </div>
          </div>

          {/* Col 2: Categories */}
          <div>
            <Eyebrow className="text-neutral-200">
              Categories
            </Eyebrow>
            <ul className="mt-4 space-y-2.5 text-body-sm">
              {FOOTER_CATEGORIES.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="transition hover:text-white hover:underline focus-visible:outline-2 focus-visible:outline-white"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Col 3: Brands */}
          <div>
            <Eyebrow className="text-neutral-200">
              Brands
            </Eyebrow>
            <ul className="mt-4 space-y-2.5 text-body-sm">
              {FOOTER_BRANDS.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="group flex flex-col transition hover:text-white focus-visible:outline-2 focus-visible:outline-white"
                  >
                    <span className="font-normal group-hover:underline">{item.label}</span>
                    <span className="text-body-sm text-neutral-400">{item.desc}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Col 4: Customer Care */}
          <div>
            <Eyebrow className="text-neutral-200">
              Customer Care
            </Eyebrow>
            <ul className="mt-4 space-y-2.5 text-body-sm">
              {customerLinks.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="transition hover:text-white hover:underline focus-visible:outline-2 focus-visible:outline-white"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
            <div className="mt-6 rounded-md border border-neutral-800 bg-neutral-900/60 p-3 text-body-sm text-neutral-400">
              <p className="font-semibold text-neutral-300">Need help with an order?</p>
              <p className="mt-1">Check order status anytime in your account dashboard.</p>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-neutral-800/80 pt-8 text-body-sm text-neutral-400 sm:flex-row">
          <p>&copy; {new Date().getFullYear()} {SITE_NAME}. Fictional portfolio fashion store.</p>
          <div className="flex items-center gap-6">
            <span>Currency: VND (₫)</span>
            <span>Deterministic Demo Data</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
