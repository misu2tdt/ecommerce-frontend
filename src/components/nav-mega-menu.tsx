"use client";

import Link from "next/link";
import { useRef, useState } from "react";

import { Eyebrow } from "@/components/ui/eyebrow";
// Only a few direct links fit beside the search and account controls; every
// other category stays reachable through "Shop All" and the mobile drawer.
const navigationItems = [
  {
    name: "T-Shirts & Tops",
    href: "/products?category=t-shirts-tops",
  },
  {
    name: "Shirts & Polos",
    href: "/products?category=shirts-polos",
  },
  {
    name: "Outerwear",
    href: "/products?category=hoodies-outerwear",
  },
];

const categoryColumns = [
  {
    title: "Tops & Layers",
    links: [
      { label: "Classic Crewneck Tees", href: "/products?q=crewneck" },
      { label: "Heavyweight Pocket Tees", href: "/products?q=heavyweight" },
      { label: "Pique Cotton Polos", href: "/products?q=polo" },
      { label: "Relaxed Oxford Shirts", href: "/products?q=oxford" },
      { label: "Linen Resort Shirts", href: "/products?q=linen" },
    ],
  },
  {
    title: "Outerwear & Bottoms",
    links: [
      { label: "French Terry Hoodies", href: "/products?q=hoodie" },
      { label: "Technical Bomber Jackets", href: "/products?q=bomber" },
      { label: "Packable Windbreakers", href: "/products?q=windbreaker" },
      { label: "Stretch Chino Pants", href: "/products?q=chino" },
      { label: "Comfort Jogger Pants", href: "/products?q=jogger" },
      { label: "Active 7\" Training Shorts", href: "/products?q=shorts" },
    ],
  },
  {
    title: "Brand Edits",
    links: [
      { label: "AeroThread — Everyday Minimal", href: "/products?brand=aerothread" },
      { label: "Kanso Basics — Comfort Essentials", href: "/products?brand=kanso-basics" },
      { label: "Veloce Active — Athletic Performance", href: "/products?brand=veloce-active" },
      { label: "Monolith Studio — Structured Tailoring", href: "/products?brand=monolith-studio" },
    ],
  },
];

export function NavMegaMenu() {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  function handleBlur(e: React.FocusEvent<HTMLDivElement>) {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDropdownOpen(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape" && dropdownOpen) {
      e.preventDefault();
      setDropdownOpen(false);
      triggerRef.current?.focus();
    }
  }

  return (
    <nav
      aria-label="Store navigation"
      className="relative hidden flex-nowrap items-center gap-1 xl:flex"
      onKeyDown={handleKeyDown}
    >
      {/* Shop / Mega Menu Trigger */}
      <div
        ref={containerRef}
        className="relative shrink-0"
        onMouseEnter={() => setDropdownOpen(true)}
        onMouseLeave={() => setDropdownOpen(false)}
        onBlur={handleBlur}
      >
        <button
          ref={triggerRef}
          type="button"
          onClick={() => setDropdownOpen((prev) => !prev)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setDropdownOpen(true);
            }
          }}
          className="group inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-md px-3 py-2 text-body-sm font-semibold text-neutral-700 transition hover:text-brand-strong focus-visible:outline-2 focus-visible:outline-neutral-900"
          aria-expanded={dropdownOpen}
          aria-controls="desktop-mega-menu-content"
        >
          <span>Shop All</span>
          <svg
            className={`h-3.5 w-3.5 text-neutral-600 transition group-hover:text-neutral-700 ${
              dropdownOpen ? "rotate-180 text-neutral-700" : ""
            }`}
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
              clipRule="evenodd"
            />
          </svg>
        </button>

        {/* Mega Menu Dropdown Content */}
        {dropdownOpen && (
          <div
            id="desktop-mega-menu-content"
            role="region"
            aria-label="Shop categories and collections"
            className="absolute left-0 top-full z-50 mt-1 w-full min-w-[700px] rounded-md border border-neutral-200/80 bg-surface p-6 shadow-xl ring-1 ring-neutral-950/5 animate-in fade-in slide-in-from-top-1 duration-150"
          >
            <div className="grid grid-cols-3 gap-8">
              {categoryColumns.map((col) => (
                <div key={col.title}>
                  <Eyebrow className="mb-3 text-neutral-600">
                    {col.title}
                  </Eyebrow>
                  <ul className="space-y-2">
                    {col.links.map((link) => (
                      <li key={link.href}>
                        <Link
                          href={link.href}
                          onClick={() => setDropdownOpen(false)}
                          className="text-body-sm font-semibold text-neutral-700 transition hover:text-brand-strong hover:underline focus-visible:outline-2 focus-visible:outline-neutral-900"
                        >
                          {link.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            <div className="mt-6 flex items-center justify-between border-t border-neutral-100 pt-4 text-body-sm font-normal text-neutral-600">
              <span>Live inventory by variant with integer VND pricing</span>
              <Link
                href="/products"
                onClick={() => setDropdownOpen(false)}
                className="font-semibold text-brand hover:underline focus-visible:outline-2 focus-visible:outline-neutral-900"
              >
                Browse all products &rarr;
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Top-level direct category navigation links */}
      {navigationItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className="shrink-0 whitespace-nowrap rounded-md px-3 py-2 text-body-sm font-semibold text-neutral-700 transition hover:text-brand-strong focus-visible:outline-2 focus-visible:outline-neutral-900"
        >
          {item.name}
        </Link>
      ))}
    </nav>
  );
}
