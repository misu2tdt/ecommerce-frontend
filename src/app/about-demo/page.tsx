import type { Metadata } from "next";
import Link from "next/link";
import { buttonStyles } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/eyebrow";
import { REPOSITORIES, SITE_NAME } from "@/lib/site";

export const metadata: Metadata = {
  title: "About this demo",
  description: `${SITE_NAME} is a portfolio e-commerce project, not a real shop. How it is built and what the backend does.`,
};

// Every highlight below was checked against the backend repository.
const BACKEND_HIGHLIGHTS = [
  "Stock is locked per size and colour while an order is placed, so two shoppers cannot buy the last item at the same time.",
  "Payment requests are idempotent: sending the same request twice never creates two payments.",
  "An order can have only one active payment at a time, enforced by a database index.",
  "Unpaid orders expire after a set time and their stock is released.",
  "Payment callbacks that arrive too late, for example after an order was cancelled, go to an admin reconciliation list instead of being lost.",
  "Only customers with a delivered order can leave a review.",
  "Requests are rate limited per client, and responses carry standard security headers.",
];

const ARCHITECTURE = [
  { name: "Browser", detail: "You" },
  { name: "Vercel", detail: "Next.js storefront" },
  { name: "Render", detail: "NestJS API" },
  { name: "Neon", detail: "PostgreSQL database" },
];

export default function AboutDemoPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
      <Eyebrow className="text-neutral-600">Portfolio project</Eyebrow>
      <h1 className="mt-2 font-bold tracking-tight text-brand-strong text-display">
        About this demo
      </h1>
      <p className="mt-4 text-body text-neutral-600 sm:text-title">
        {SITE_NAME} is a portfolio e-commerce project. It is not a real shop.
      </p>

      <section aria-labelledby="what-heading" className="mt-12">
        <h2
          id="what-heading"
          className="text-heading font-bold tracking-tight text-brand-strong"
        >
          What this is
        </h2>
        <p className="mt-3 text-body text-neutral-600">
          A complete online store built end to end: browsing, cart, checkout,
          payments, orders, reviews, a wishlist and an admin area. No real
          payments are taken and nothing is shipped. The products and photos are
          demo data.
        </p>
        <p className="mt-3 text-body text-neutral-600">
          To try it, create an account with{" "}
          <Link
            href="/register"
            className="font-semibold text-brand underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-brand"
          >
            Register
          </Link>
          , or sign in as the sample customer:{" "}
          <span className="font-semibold text-brand-strong">
            demo.customer@example.com
          </span>{" "}
          with the password{" "}
          <span className="font-semibold text-brand-strong">DemoOnly!2026</span>.
        </p>
      </section>

      <section aria-labelledby="built-heading" className="mt-12">
        <h2
          id="built-heading"
          className="text-heading font-bold tracking-tight text-brand-strong"
        >
          How it is built
        </h2>
        <p className="mt-3 text-body text-neutral-600">
          A Next.js storefront talks to a NestJS API, which stores its data in
          PostgreSQL. Product photos are served by Cloudinary.
        </p>
        <ol className="mt-5 flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
          {ARCHITECTURE.map((step, index) => (
            <li key={step.name} className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="rounded-md border border-line bg-surface-muted px-4 py-3">
                <p className="font-semibold text-brand-strong">{step.name}</p>
                <p className="text-body-sm text-neutral-600">{step.detail}</p>
              </div>
              {index < ARCHITECTURE.length - 1 && (
                <>
                  <span aria-hidden="true" className="text-neutral-600 sm:hidden">
                    ↓
                  </span>
                  <span aria-hidden="true" className="hidden text-neutral-600 sm:inline">
                    →
                  </span>
                </>
              )}
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="backend-heading" className="mt-12">
        <h2
          id="backend-heading"
          className="text-heading font-bold tracking-tight text-brand-strong"
        >
          Backend engineering highlights
        </h2>
        <ul className="mt-4 list-disc space-y-2 pl-5 text-body text-neutral-600">
          {BACKEND_HIGHLIGHTS.map((highlight) => (
            <li key={highlight}>{highlight}</li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="code-heading" className="mt-12">
        <h2
          id="code-heading"
          className="text-heading font-bold tracking-tight text-brand-strong"
        >
          Source code
        </h2>
        <p className="mt-3 text-body text-neutral-600">
          Both repositories are public on GitHub.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <a
            href={REPOSITORIES.frontend}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonStyles({ variant: "secondary", size: "md" })}
          >
            Frontend on GitHub
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
          <a
            href={REPOSITORIES.backend}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonStyles({ variant: "secondary", size: "md" })}
          >
            Backend on GitHub
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
        </div>
      </section>

      <div className="mt-12 border-t border-line pt-8">
        <Link
          href="/products"
          className={buttonStyles({ variant: "primary", size: "lg" })}
        >
          Browse the store
        </Link>
      </div>
    </div>
  );
}
