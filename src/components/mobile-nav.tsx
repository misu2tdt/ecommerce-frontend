"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { logoutAction } from "@/features/auth/actions";
import { HeaderSearch } from "./header-search";

interface MobileNavProps {
  user: { email: string; role: string } | null;
}

const categories = [
  { name: "All Products", href: "/products" },
  { name: "T-Shirts & Tops", href: "/products?category=t-shirts-tops" },
  { name: "Shirts & Polos", href: "/products?category=shirts-polos" },
  { name: "Hoodies & Outerwear", href: "/products?category=hoodies-outerwear" },
  { name: "Pants & Shorts", href: "/products?category=pants-shorts" },
  { name: "Basics & Accessories", href: "/products?category=basics-accessories" },
];

const brands = [
  { name: "AeroThread", href: "/products?brand=aerothread", tag: "Everyday Minimal" },
  { name: "Kanso Basics", href: "/products?brand=kanso-basics", tag: "Comfort Essentials" },
  { name: "Veloce Active", href: "/products?brand=veloce-active", tag: "Performance" },
  { name: "Monolith Studio", href: "/products?brand=monolith-studio", tag: "Structured Tailoring" },
];

export function MobileNav(props: MobileNavProps) {
  return (
    <Suspense fallback={<MobileNavTriggerFallback />}>
      <MobileNavContent {...props} />
    </Suspense>
  );
}

function MobileNavTriggerFallback() {
  return (
    <div className="lg:hidden">
      <button
        type="button"
        disabled
        aria-label="Open mobile navigation menu"
        className="inline-flex h-10 w-10 items-center justify-center rounded-lg p-2 text-slate-400"
      >
        <svg
          className="h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
          />
        </svg>
      </button>
    </div>
  );
}

function MobileNavContent({ user }: MobileNavProps) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previouslyFocusedElementRef = useRef<HTMLElement | null>(null);

  const routeKey = `${pathname}?${searchParams.toString()}`;

  // Close drawer on route or search change
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsOpen(false);
  }, [routeKey]);

  // Focus management and body scroll locking
  useEffect(() => {
    if (isOpen) {
      previouslyFocusedElementRef.current = document.activeElement as HTMLElement;
      document.body.style.overflow = "hidden";

      // Focus the close button once the drawer is rendered
      const timer = setTimeout(() => {
        closeButtonRef.current?.focus();
      }, 50);

      return () => {
        clearTimeout(timer);
        document.body.style.overflow = "";
      };
    } else {
      document.body.style.overflow = "";
      if (previouslyFocusedElementRef.current) {
        previouslyFocusedElementRef.current.focus();
      }
    }
  }, [isOpen]);

  // Keyboard navigation: Escape to close and Tab focus containment
  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        setIsOpen(false);
        return;
      }

      if (e.key === "Tab" && drawerRef.current) {
        const focusable = drawerRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        );

        if (focusable.length === 0) return;

        const firstElement = focusable[0];
        const lastElement = focusable[focusable.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  return (
    <div className="lg:hidden">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen(true)}
        aria-label="Open mobile navigation menu"
        aria-expanded={isOpen}
        aria-controls="mobile-navigation-drawer"
        className="inline-flex h-10 w-10 items-center justify-center rounded-lg p-2 text-slate-700 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-slate-900"
      >
        <svg
          className="h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
          />
        </svg>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />

          {/* Drawer Dialog */}
          <div
            id="mobile-navigation-drawer"
            ref={drawerRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="mobile-nav-title"
            className="relative flex w-full max-w-xs flex-1 flex-col bg-white shadow-2xl"
          >
            {/* Drawer Header */}
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <Link
                id="mobile-nav-title"
                href="/"
                onClick={() => setIsOpen(false)}
                className="text-base font-extrabold tracking-wider text-slate-950 focus-visible:outline-2 focus-visible:outline-slate-900"
              >
                VERVE STUDIO
              </Link>
              <button
                ref={closeButtonRef}
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="Close navigation menu"
                className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-slate-900"
              >
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* Search within Drawer */}
            <div className="border-b border-slate-100 p-4">
              <HeaderSearch
                id="mobile-header-search-input"
                onSearchSubmitted={() => setIsOpen(false)}
              />
            </div>

            {/* Drawer Navigation Content */}
            <div className="flex-1 overflow-y-auto px-5 py-4">
              {/* Category section */}
              <div className="mb-6">
                <p className="mb-2 text-xs font-bold uppercase tracking-widest text-slate-500">
                  Catalog
                </p>
                <nav className="space-y-1">
                  {categories.map((cat) => (
                    <Link
                      key={cat.href}
                      href={cat.href}
                      onClick={() => setIsOpen(false)}
                      className="block rounded-lg px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50 hover:text-slate-950 focus-visible:outline-2 focus-visible:outline-slate-900"
                    >
                      {cat.name}
                    </Link>
                  ))}
                </nav>
              </div>

              {/* Brands section */}
              <div className="mb-6 border-t border-slate-100 pt-5">
                <p className="mb-2 text-xs font-bold uppercase tracking-widest text-slate-500">
                  Featured Brands
                </p>
                <nav className="space-y-1">
                  {brands.map((b) => (
                    <Link
                      key={b.href}
                      href={b.href}
                      onClick={() => setIsOpen(false)}
                      className="flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-950 focus-visible:outline-2 focus-visible:outline-slate-900"
                    >
                      <span>{b.name}</span>
                      <span className="text-xs text-slate-500">{b.tag}</span>
                    </Link>
                  ))}
                </nav>
              </div>

              {/* Account / Quick Links */}
              <div className="border-t border-slate-100 pt-5">
                <p className="mb-2 text-xs font-bold uppercase tracking-widest text-slate-500">
                  Customer
                </p>
                <div className="space-y-1 text-sm">
                  <Link
                    href="/cart"
                    onClick={() => setIsOpen(false)}
                    className="flex items-center justify-between rounded-lg px-3 py-2 font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-950 focus-visible:outline-2 focus-visible:outline-slate-900"
                  >
                    <span>Shopping Cart</span>
                    <span className="text-xs font-bold text-slate-500">Bag</span>
                  </Link>
                  <Link
                    href="/wishlist"
                    onClick={() => setIsOpen(false)}
                    className="flex items-center justify-between rounded-lg px-3 py-2 font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-950 focus-visible:outline-2 focus-visible:outline-slate-900"
                  >
                    <span>Saved Wishlist</span>
                    <span className="text-xs font-bold text-slate-500">Saved</span>
                  </Link>

                  {user ? (
                    <>
                      <Link
                        href="/account"
                        onClick={() => setIsOpen(false)}
                        className="block rounded-lg px-3 py-2 font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-950 focus-visible:outline-2 focus-visible:outline-slate-900"
                      >
                        Account Profile
                      </Link>
                      <Link
                        href="/account/orders"
                        onClick={() => setIsOpen(false)}
                        className="block rounded-lg px-3 py-2 font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-950 focus-visible:outline-2 focus-visible:outline-slate-900"
                      >
                        Order History
                      </Link>
                      {user.role === "admin" && (
                        <Link
                          href="/admin"
                          onClick={() => setIsOpen(false)}
                          className="block rounded-lg bg-amber-50 px-3 py-2 font-semibold text-amber-900 hover:bg-amber-100 focus-visible:outline-2 focus-visible:outline-amber-900"
                        >
                          Catalog Administration
                        </Link>
                      )}
                      <form
                        action={async () => {
                          setIsOpen(false);
                          await logoutAction();
                        }}
                        className="pt-2"
                      >
                        <button
                          type="submit"
                          className="w-full rounded-lg px-3 py-2 text-left font-medium text-red-600 hover:bg-red-50 focus-visible:outline-2 focus-visible:outline-red-600"
                        >
                          Sign Out ({user.email})
                        </button>
                      </form>
                    </>
                  ) : (
                    <div className="grid grid-cols-2 gap-2 pt-2">
                      <Link
                        href="/login"
                        onClick={() => setIsOpen(false)}
                        className="flex items-center justify-center rounded-lg border border-slate-200 py-2.5 text-center font-semibold text-slate-800 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-slate-900"
                      >
                        Sign In
                      </Link>
                      <Link
                        href="/register"
                        onClick={() => setIsOpen(false)}
                        className="flex items-center justify-center rounded-lg bg-slate-900 py-2.5 text-center font-semibold text-white hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-slate-900"
                      >
                        Register
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
