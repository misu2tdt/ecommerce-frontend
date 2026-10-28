import Link from "next/link";
import { ProductCard } from "@/components/product-card";
import { ProductGrid } from "@/components/product-grid";
import { getProducts } from "@/features/catalog/api";
import type { ProductSummary } from "@/types/catalog";

import { Eyebrow } from "@/components/ui/eyebrow";
const categoryHighlights = [
  {
    slug: "t-shirts-tops",
    name: "T-Shirts & Tops",
    tagline: "Heavyweight tees, waffle knits & daily crewnecks",
    badge: "Essential",
  },
  {
    slug: "shirts-polos",
    name: "Shirts & Polos",
    tagline: "Pique cotton polos & relaxed Oxford button-downs",
    badge: "Smart Casual",
  },
  {
    slug: "hoodies-outerwear",
    name: "Hoodies & Outerwear",
    tagline: "French terry zip hoodies & packable windbreakers",
    badge: "Layering",
  },
  {
    slug: "pants-shorts",
    name: "Pants & Shorts",
    tagline: "Everyday stretch chinos & active training shorts",
    badge: "Versatile",
  },
  {
    slug: "basics-accessories",
    name: "Basics & Accessories",
    tagline: "Bamboo boxer briefs, modal trunks & canvas totes",
    badge: "Daily Core",
  },
];

const brandEdits = [
  {
    title: "Veloce Active",
    subtitle: "High-Performance Motion",
    description:
      "Breathable mesh singlets, 7-inch training shorts, and weather-resistant packable trail windbreakers engineered for movement.",
    href: "/products?brand=veloce-active",
    cta: "Explore Veloce Active",
    badge: "Performance",
  },
  {
    title: "Monolith Studio",
    subtitle: "Contemporary Structured Tailoring",
    description:
      "Heavyweight overshirts, utility cargo shorts, and tailored pleated trousers designed for clean, intentional everyday silhouettes.",
    href: "/products?brand=monolith-studio",
    cta: "Explore Monolith Studio",
    badge: "Tailored",
  },
];

const valuePillars = [
  {
    title: "Honest VND Pricing",
    description:
      "Transparent integer prices from 99,000₫ with zero surprise markups at checkout.",
    icon: (
      <svg
        className="h-6 w-6 text-brand"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth="1.75"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
  },
  {
    title: "Real-Time Stock Accuracy",
    description:
      "Variant-level inventory updates ensuring instant visibility across sizes and colorways.",
    icon: (
      <svg
        className="h-6 w-6 text-brand"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth="1.75"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z"
        />
      </svg>
    ),
  },
  {
    title: "Verified Customer Reviews",
    description:
      "Authentic feedback and ratings submitted exclusively by verified purchasers.",
    icon: (
      <svg
        className="h-6 w-6 text-brand"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth="1.75"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z"
        />
      </svg>
    ),
  },
  {
    title: "Order Management in Account",
    description:
      "Order status visibility from confirmation through delivery in your customer account dashboard.",
    icon: (
      <svg
        className="h-6 w-6 text-brand"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth="1.75"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9 12.75L11.25 15 15 9.75m-2.18-5.731a1.5 1.5 0 00-1.64 0l-6 3.428A1.5 1.5 0 004.5 9.75v4.5a1.5 1.5 0 00.68 1.253l6 3.428a1.5 1.5 0 001.64 0l6-3.428a1.5 1.5 0 00.68-1.253v-4.5a1.5 1.5 0 00-.68-1.253l-6-3.428z"
        />
      </svg>
    ),
  },
];

export default async function Home() {
  let products: ProductSummary[] = [];

  try {
    products = await getProducts();
  } catch {
    // Keep homepage resilient if the catalog API is unreachable during build or cold start
  }

  // Curate products deterministically without repeating
  const featuredCollection = products.slice(0, 6);
  const everydayEssentials = products.slice(6, 12);

  return (
    <div className="flex flex-col">
      {/* 1. HERO MERCHANDISING SECTION */}
      <section className="relative overflow-hidden bg-brand-strong py-20 text-white sm:py-28 lg:py-36">
        {/* Subtle decorative grid background */}
        <div
          className="absolute inset-0 bg-[radial-gradient(#404040_1px,transparent_1px)] [background-size:24px_24px] opacity-20"
          aria-hidden="true"
        />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            {/* Pill tag */}
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-neutral-700/80 bg-neutral-900/90 px-3.5 py-1.5 text-body-sm font-semibold text-neutral-200 backdrop-blur-md">
              <span className="h-2 w-2 rounded-full bg-neutral-400 animate-pulse" />
              <span>Curated Fashion Catalog • Live Inventory</span>
            </div>

            {/* Headline */}
            <h1 className="font-bold tracking-tight text-white text-display">
              Built for Every Day.
              <br />
              <span className="bg-gradient-to-r from-neutral-200 via-neutral-400 to-neutral-200 bg-clip-text text-transparent">
                Engineered for Comfort.
              </span>
            </h1>

            {/* Subtitle */}
            <p className="mt-6 text-body text-neutral-300 sm:text-title">
              Discover contemporary essentials crafted with breathable natural
              fibers, minimalist silhouettes, and technical durability for work,
              movement, and rest.
            </p>

            {/* CTAs */}
            <div className="mt-8 flex flex-wrap items-center gap-4 sm:mt-10">
              <Link
                href="/products"
                className="inline-flex min-h-12 items-center justify-center rounded-md bg-surface px-7 text-body-sm font-bold text-brand-strong transition hover:bg-brand-soft focus-visible:outline-2 focus-visible:outline-white"
              >
                Shop All Products
              </Link>
              <Link
                href="#categories"
                className="inline-flex min-h-12 items-center justify-center rounded-md border border-neutral-700 bg-neutral-900/60 px-6 text-body-sm font-semibold text-neutral-200 backdrop-blur-sm transition hover:border-neutral-500 hover:text-white focus-visible:outline-2 focus-visible:outline-white"
              >
                Explore Categories
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 2. VALUE PROPOSITION BAR */}
      <section className="border-b border-line bg-surface py-6">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:gap-8">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-soft text-neutral-800">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
                </svg>
              </div>
              <div>
                <p className="text-body-sm font-bold text-brand">Live Inventory</p>
                <p className="text-body-sm text-neutral-600">Variant-level stock</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-soft text-neutral-800">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-body-sm font-bold text-brand">Integer VND</p>
                <p className="text-body-sm text-neutral-600">Transparent pricing</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-soft text-neutral-800">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />
                </svg>
              </div>
              <div>
                <p className="text-body-sm font-bold text-brand">Verified Reviews</p>
                <p className="text-body-sm text-neutral-600">Delivered purchaser ratings</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-soft text-neutral-800">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                </svg>
              </div>
              <div>
                <p className="text-body-sm font-bold text-brand">Secure Checkout</p>
                <p className="text-body-sm text-neutral-600">Secure account sessions</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. SHOP BY CATEGORY SECTION */}
      <section id="categories" className="py-14 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <Eyebrow className="text-neutral-600">
                Curated Navigation
              </Eyebrow>
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

          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {categoryHighlights.map((cat) => (
              <Link
                key={cat.slug}
                href={`/products?category=${cat.slug}`}
                className={`group relative flex min-h-60 flex-col justify-between overflow-hidden rounded-md bg-brand p-6 text-white transition duration-200 hover:bg-brand-strong focus-visible:outline-2 focus-visible:outline-brand`}
              >
                {/* Background decorative pattern */}
                <div
                  className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/5 blur-2xl transition duration-300 group-hover:scale-150"
                  aria-hidden="true"
                />

                <div className="relative">
                  <span className="inline-block rounded-full bg-white/10 px-2.5 py-1 text-body-sm font-semibold text-neutral-200 backdrop-blur-md">
                    {cat.badge}
                  </span>
                </div>

                <div className="relative">
                  <h3 className="text-title font-bold tracking-tight text-white group-hover:underline">
                    {cat.name}
                  </h3>
                  <p className="mt-2 text-body-sm text-neutral-300 line-clamp-2">
                    {cat.tagline}
                  </p>
                  <span className="mt-4 inline-flex items-center gap-1 text-body-sm font-semibold text-neutral-300">
                    Explore &rarr;
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* 4. FEATURED COLLECTION PRODUCT GRID */}
      <section className="border-t border-line bg-surface-muted py-14 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <Eyebrow className="text-neutral-600">
                Curated Selection
              </Eyebrow>
              <h2 className="mt-1 text-heading font-bold tracking-tight text-brand-strong">
                Featured Collection
              </h2>
              <p className="mt-1 text-body-sm text-neutral-600">
                Foundational tees, polos, and daily layers from our catalog.
              </p>
            </div>
            <Link
              href="/products"
              className="text-body-sm font-bold text-brand transition hover:underline focus-visible:outline-2 focus-visible:outline-brand"
            >
              View all products &rarr;
            </Link>
          </div>

          {featuredCollection.length === 0 ? (
            <div className="mt-8 rounded-md border border-dashed border-field-border bg-surface p-12 text-center text-neutral-600">
              <p className="font-semibold text-brand">Products are temporarily unavailable.</p>
              <p className="mt-1 text-body-sm">Please try again shortly.</p>
            </div>
          ) : (
            <ProductGrid className="mt-8">
              {featuredCollection.map((product, index) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  priority={index < 4}
                />
              ))}
            </ProductGrid>
          )}
        </div>
      </section>

      {/* 5. EDITORIAL / COLLECTION SPOTLIGHT BLOCK */}
      <section className="py-14 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <Eyebrow className="text-neutral-600">
              Editorial Spotlight
            </Eyebrow>
            <h2 className="mt-1 text-heading font-bold tracking-tight text-brand-strong">
              Brand Collections
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {brandEdits.map((edit) => (
              <div
                key={edit.title}
                className={`relative flex min-h-80 flex-col justify-between overflow-hidden rounded-md bg-brand p-8 text-white sm:p-10`}
              >
                <div>
                  <span className="inline-block rounded-full bg-white/10 px-3 py-1 text-body-sm font-semibold text-neutral-200 backdrop-blur-md">
                    {edit.badge}
                  </span>
                  <h3 className="mt-4 text-heading font-bold tracking-tight text-white">
                    {edit.title}
                  </h3>
                  <p className="mt-1 text-body-sm font-normal text-neutral-300">
                    {edit.subtitle}
                  </p>
                  <p className="mt-4 max-w-md text-body-sm text-neutral-300 sm:text-body">
                    {edit.description}
                  </p>
                </div>

                <div className="mt-8">
                  <Link
                    href={edit.href}
                    className="inline-flex min-h-10 items-center justify-center rounded-md bg-surface px-5 text-body-sm font-bold text-brand-strong transition hover:bg-brand-soft focus-visible:outline-2 focus-visible:outline-white"
                  >
                    {edit.cta} &rarr;
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. EVERYDAY ESSENTIALS SECTION (Rendered only if catalog has > 6 products) */}
      {everydayEssentials.length > 0 && (
        <section className="border-t border-line bg-surface-muted py-14 sm:py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <Eyebrow className="text-neutral-600">
                  Core Wardrobe
                </Eyebrow>
                <h2 className="mt-1 text-heading font-bold tracking-tight text-brand-strong">
                  Everyday Essentials
                </h2>
                <p className="mt-1 text-body-sm text-neutral-600">
                  Versatile staples designed for comfortable daily rotation.
                </p>
              </div>
              <Link
                href="/products"
                className="text-body-sm font-bold text-brand transition hover:underline focus-visible:outline-2 focus-visible:outline-brand"
              >
                Explore entire catalog &rarr;
              </Link>
            </div>

            <ProductGrid className="mt-8">
              {everydayEssentials.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </ProductGrid>
          </div>
        </section>
      )}

      {/* 7. BRAND VALUE PROPOSITIONS & TRUST PILLARS */}
      <section className="border-t border-line py-14 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <Eyebrow className="text-neutral-600">
              Why Shop With Us
            </Eyebrow>
            <h2 className="mt-1 text-heading font-bold tracking-tight text-brand-strong">
              Practical Fashion, Built on Trust
            </h2>
            <p className="mx-auto mt-2 max-w-2xl text-body-sm text-neutral-600">
              We focus on everyday apparel that fits reliably, wears comfortably,
              and backs every claim with live inventory and verified customer feedback.
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {valuePillars.map((pillar) => (
              <div
                key={pillar.title}
                className="flex flex-col items-center rounded-md border border-line bg-surface p-6 text-center"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-soft">
                  {pillar.icon}
                </div>
                <h3 className="mt-4 text-body-sm font-bold text-brand">
                  {pillar.title}
                </h3>
                <p className="mt-2 text-body-sm text-neutral-600">
                  {pillar.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
