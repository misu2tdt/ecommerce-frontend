import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { FeedbackState } from "@/components/feedback-state";
import { getCurrentUser } from "@/features/auth/current-user";
import { buildLoginHref } from "@/features/auth/redirects";
import { apiErrorMessage } from "@/lib/api";

import { Eyebrow } from "@/components/ui/eyebrow";
import { SITE_NAME } from "@/lib/site";
export const metadata: Metadata = {
  title: "Account",
  description: `Your ${SITE_NAME} account.`,
};

export default async function AccountPage() {
  const result = await loadAccountUser();
  if ("error" in result) {
    return (
      <section className="mx-auto max-w-3xl px-6 py-16">
        <FeedbackState
          title="Account unavailable"
          description={apiErrorMessage(result.error)}
        />
      </section>
    );
  }

  const { user } = result;
  if (!user) redirect(buildLoginHref("/account"));

  return (
    <section className="mx-auto max-w-3xl px-6 py-12 sm:py-16">
      <div className="rounded-md border border-line bg-surface p-6 sm:p-8">
        <Eyebrow>
          Signed in
        </Eyebrow>
        <h1 className="mt-2 font-bold tracking-tight text-brand-strong text-display">
          Your account
        </h1>
        <p className="mt-3 text-neutral-600">
          You are signed in with this account.
        </p>

        <dl className="mt-8 grid gap-4 sm:grid-cols-2">
          <div className="rounded-md bg-surface-muted p-4">
            <dt className="uppercase text-neutral-600 text-caption font-semibold tracking-eyebrow">
              Email
            </dt>
            <dd className="mt-2 break-all font-semibold text-brand-strong">
              {user.email}
            </dd>
          </div>
          <div className="rounded-md bg-surface-muted p-4">
            <dt className="uppercase text-neutral-600 text-caption font-semibold tracking-eyebrow">
              Role
            </dt>
            <dd className="mt-2 font-semibold capitalize text-brand-strong">
              {user.role}
            </dd>
          </div>
          <div className="rounded-md bg-surface-muted p-4 sm:col-span-2">
            <dt className="uppercase text-neutral-600 text-caption font-semibold tracking-eyebrow">
              Account ID
            </dt>
            <dd className="mt-2 font-semibold text-brand-strong">{user.id}</dd>
          </div>
        </dl>

        <nav
          aria-label="Account sections"
          className="mt-8 grid gap-3 border-t border-line pt-6 sm:grid-cols-2"
        >
          <Link
            href="/account/orders"
            className="rounded-md border border-line p-4 font-semibold text-brand hover:border-brand hover:bg-brand-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          >
            <span className="block text-title">Your Orders</span>
            <span className="mt-1 block text-body-sm font-normal text-neutral-600">
              Review purchases and Order status
            </span>
          </Link>
          <Link
            href="/account/addresses"
            className="rounded-md border border-line p-4 font-semibold text-brand hover:border-brand hover:bg-brand-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          >
            <span className="block text-title">Saved addresses</span>
            <span className="mt-1 block text-body-sm font-normal text-neutral-600">
              Manage checkout destinations
            </span>
          </Link>
          <Link
            href="/wishlist"
            className="rounded-md border border-line p-4 font-semibold text-brand hover:border-brand hover:bg-brand-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand sm:col-span-2"
          >
            <span className="block text-title">Your wishlist</span>
            <span className="mt-1 block text-body-sm font-normal text-neutral-600">
              Revisit products you saved
            </span>
          </Link>
        </nav>
      </div>
    </section>
  );
}

async function loadAccountUser() {
  try {
    return { user: await getCurrentUser() };
  } catch (error) {
    return { error };
  }
}
