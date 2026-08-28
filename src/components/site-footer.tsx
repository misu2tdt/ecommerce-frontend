import Link from "next/link";

const categories = [
  { label: "All Products", href: "/products" },
  { label: "T-Shirts & Tops", href: "/products?category=t-shirts-tops" },
  { label: "Shirts & Polos", href: "/products?category=shirts-polos" },
  { label: "Hoodies & Outerwear", href: "/products?category=hoodies-outerwear" },
  { label: "Pants & Shorts", href: "/products?category=pants-shorts" },
  { label: "Basics & Accessories", href: "/products?category=basics-accessories" },
];

const brands = [
  { label: "AeroThread", href: "/products?brand=aerothread", desc: "Everyday Minimal" },
  { label: "Kanso Basics", href: "/products?brand=kanso-basics", desc: "Comfort Essentials" },
  { label: "Veloce Active", href: "/products?brand=veloce-active", desc: "Performance Apparel" },
  { label: "Monolith Studio", href: "/products?brand=monolith-studio", desc: "Structured Tailoring" },
];

const customerLinks = [
  { label: "My Account", href: "/account" },
  { label: "Order History", href: "/account/orders" },
  { label: "Shopping Bag", href: "/cart" },
  { label: "Saved Wishlist", href: "/wishlist" },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-slate-200 bg-slate-950 text-slate-400">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4 lg:gap-12">
          {/* Col 1: Brand Info */}
          <div className="col-span-2 md:col-span-1">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-base font-black tracking-tight text-white focus-visible:outline-2 focus-visible:outline-white"
            >
              <span className="tracking-widest">VERVE</span>
              <span className="text-xs font-semibold tracking-widest text-slate-400">STUDIO</span>
            </Link>
            <p className="mt-3 text-xs leading-relaxed text-slate-400">
              Modern commercial fashion storefront engineered for comfort,
              movement, and everyday utility. Powered by Next.js and NestJS.
            </p>
            <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-slate-800 bg-slate-900 px-3 py-1 text-[11px] font-medium text-slate-300">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              <span>Live Fashion Catalog</span>
            </div>
          </div>

          {/* Col 2: Categories */}
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-200">
              Categories
            </p>
            <ul className="mt-4 space-y-2.5 text-xs">
              {categories.map((item) => (
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
            <p className="text-xs font-bold uppercase tracking-wider text-slate-200">
              Brands
            </p>
            <ul className="mt-4 space-y-2.5 text-xs">
              {brands.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="group flex flex-col transition hover:text-white focus-visible:outline-2 focus-visible:outline-white"
                  >
                    <span className="font-medium group-hover:underline">{item.label}</span>
                    <span className="text-[10px] text-slate-400">{item.desc}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Col 4: Customer Care */}
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-200">
              Customer Care
            </p>
            <ul className="mt-4 space-y-2.5 text-xs">
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
            <div className="mt-6 rounded-lg border border-slate-800 bg-slate-900/60 p-3 text-[11px] text-slate-400">
              <p className="font-semibold text-slate-300">Need help with an order?</p>
              <p className="mt-1">Check order status anytime in your account dashboard.</p>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-slate-800/80 pt-8 text-xs text-slate-400 sm:flex-row">
          <p>&copy; {new Date().getFullYear()} VERVE STUDIO. Fictional portfolio fashion store.</p>
          <div className="flex items-center gap-6">
            <span>Currency: VND (₫)</span>
            <span>Deterministic Demo Data</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
