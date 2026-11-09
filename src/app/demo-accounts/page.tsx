import type { Metadata } from "next";
import Link from "next/link";
import { CopyButton } from "@/components/copy-button";
import { buttonStyles } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/eyebrow";
import { noIndex } from "@/lib/seo";
import { DEMO_ACCOUNTS, SITE_NAME } from "@/lib/site";

export const metadata: Metadata = {
  title: "Demo accounts",
  description: `Sample customer and admin accounts for trying the ${SITE_NAME} portfolio store.`,
  ...noIndex(),
};

const ACCOUNTS = [
  {
    id: "customer",
    role: "Customer",
    account: DEMO_ACCOUNTS.customer,
    description:
      "Browse products, fill a cart, check out with the demo payment, follow orders, write reviews and keep a wishlist.",
  },
  {
    id: "admin",
    role: "Admin",
    account: DEMO_ACCOUNTS.admin,
    description:
      "Manage products, categories, brands, promotions and orders, moderate reviews and handle late-payment review.",
  },
] as const;

const NOTICES = [
  `${SITE_NAME} is a portfolio demo, not a real shop.`,
  "These accounts are shared by every visitor.",
  "Changes made with the admin account are visible to everyone, and the data may be reset at any time.",
  "No real payments are taken. Please do not enter personal information.",
];

export default function DemoAccountsPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
      <Eyebrow className="text-neutral-600">Portfolio project</Eyebrow>
      <h1 className="mt-2 font-bold tracking-tight text-brand-strong text-display">
        Demo accounts
      </h1>
      <p className="mt-4 text-body text-neutral-600 sm:text-title">
        Sign in with one of these sample accounts to try the store, or create
        your own with Register.
      </p>

      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        {ACCOUNTS.map(({ id, role, account, description }) => (
          <section
            key={id}
            aria-labelledby={`${id}-heading`}
            className="flex flex-col rounded-md border border-line bg-surface p-5 sm:p-6"
          >
            <h2
              id={`${id}-heading`}
              className="text-heading font-bold tracking-tight text-brand-strong"
            >
              {role}
            </h2>
            <p className="mt-2 text-body text-neutral-600">{description}</p>

            <dl className="mt-5 space-y-4">
              <div>
                <dt className="text-body-sm font-semibold text-neutral-600">
                  Email
                </dt>
                <dd className="mt-1 flex items-center justify-between gap-3">
                  <span className="min-w-0 break-all font-semibold text-brand-strong">
                    {account.email}
                  </span>
                  <CopyButton value={account.email} what={`${id} email`} />
                </dd>
              </div>
              <div>
                <dt className="text-body-sm font-semibold text-neutral-600">
                  Password
                </dt>
                <dd className="mt-1 flex items-center justify-between gap-3">
                  <span className="min-w-0 break-all font-semibold text-brand-strong">
                    {account.password}
                  </span>
                  <CopyButton value={account.password} what={`${id} password`} />
                </dd>
              </div>
            </dl>

            <Link
              href="/login"
              className={buttonStyles({
                variant: "primary",
                size: "md",
                className: "mt-6 w-full",
              })}
            >
              Sign in
              <span className="sr-only"> as {role.toLowerCase()}</span>
            </Link>
          </section>
        ))}
      </div>

      <section
        aria-labelledby="notice-heading"
        className="mt-10 rounded-md border border-line bg-surface-muted p-5 sm:p-6"
      >
        <h2
          id="notice-heading"
          className="text-title font-semibold text-brand-strong"
        >
          Before you start
        </h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-body text-neutral-600">
          {NOTICES.map((notice) => (
            <li key={notice}>{notice}</li>
          ))}
        </ul>
      </section>

      <p className="mt-8 text-body text-neutral-600">
        Curious how it is built? Read{" "}
        <Link
          href="/about-demo"
          className="font-semibold text-brand underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-brand"
        >
          About this demo
        </Link>
        .
      </p>
    </div>
  );
}
