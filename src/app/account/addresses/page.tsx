import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AddressForm } from "@/components/address-form";
import { AddressMutationControls } from "@/components/address-mutation-controls";
import { AddressSummary } from "@/components/address-summary";
import { AccountNav } from "@/components/account-nav";
import { FeedbackState } from "@/components/feedback-state";
import { getAddresses } from "@/features/addresses/api";
import { buildLoginHref, safeInternalPath } from "@/features/auth/redirects";
import { ApiError, apiErrorMessage } from "@/lib/api";
import type { Address } from "@/types/address";

import { buttonStyles } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Badge } from "@/components/ui/badge";
import { SITE_NAME } from "@/lib/site";
export const metadata: Metadata = {
  title: "Saved addresses",
  description: `Manage your ${SITE_NAME} shipping addresses.`,
};

type AddressSearchParams = Record<string, string | string[] | undefined>;

export default async function AddressesPage({
  searchParams,
}: {
  searchParams: Promise<AddressSearchParams>;
}) {
  const query = await searchParams;
  const returnPath = safeInternalPath(query.returnTo, "/account/addresses");
  const result = await loadAddresses();
  if ("unauthenticated" in result) {
    redirect(buildLoginHref("/account/addresses"));
  }
  if ("error" in result) {
    return (
      <section className="mx-auto max-w-5xl px-6 py-16">
        <FeedbackState
          title="Addresses unavailable"
          description={apiErrorMessage(result.error)}
          actionHref="/account/addresses"
          actionLabel="Try again"
        />
      </section>
    );
  }

  const addresses = result.data;
  return (
    <section className="mx-auto max-w-5xl px-6 py-10 sm:py-14">
      <AccountNav />
      <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Eyebrow>
            Your account
          </Eyebrow>
          <h1 className="mt-2 font-bold tracking-tight text-brand-strong text-display">
            Saved addresses
          </h1>
          <p className="mt-3 text-neutral-600">
            You can choose one of these addresses when you check out.
          </p>
        </div>
        {returnPath !== "/account/addresses" && (
          <Link
            href={returnPath}
            className={buttonStyles({ variant: "secondary", size: "md" })}
          >
            Return to checkout
          </Link>
        )}
      </div>

      <div className="mt-8 grid gap-5 lg:grid-cols-2">
        {addresses.map((address) => (
          <article
            key={address.id}
            className="rounded-md border border-line bg-surface p-5 sm:p-6"
          >
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-title font-bold text-brand-strong">
                {address.label ?? "Saved address"}
              </h2>
              {address.isDefault && (
                <Badge>Default</Badge>
              )}
            </div>
            <div className="mt-3">
              <AddressSummary address={address} />
            </div>
            <details className="mt-5 rounded-md border border-line p-4">
              <summary className="cursor-pointer font-semibold text-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand">
                Edit address
              </summary>
              <div className="mt-5 border-t border-line pt-5">
                <AddressForm
                  mode="edit"
                  address={address}
                  returnPath="/account/addresses"
                />
              </div>
            </details>
            <AddressMutationControls
              addressId={address.id}
              isDefault={address.isDefault}
            />
          </article>
        ))}
      </div>

      {addresses.length === 0 && (
        <p className="mt-8 rounded-md border border-line bg-surface-muted px-5 py-6 text-neutral-600">
          You do not have a saved address yet. Add one below to prepare for
          checkout.
        </p>
      )}

      <section className="mt-10 rounded-md border border-line bg-surface p-5 sm:p-7">
        <h2 className="text-heading font-bold text-brand-strong">Add an address</h2>
        <p className="mt-2 text-body-sm text-neutral-600">
          Optional fields may be left blank. Country uses a two-letter code.
        </p>
        <div className="mt-6">
          <AddressForm mode="create" returnPath="/account/addresses" />
        </div>
      </section>

      <p className="mt-6 text-body-sm text-neutral-600">
        Deleting or editing a saved address does not change the immutable
        shipping snapshot on an existing Order. Deleting a default address
        does not automatically promote another address.
      </p>
    </section>
  );
}

async function loadAddresses(): Promise<
  { data: Address[] } | { unauthenticated: true } | { error: unknown }
> {
  try {
    return { data: await getAddresses() };
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      return { unauthenticated: true };
    }
    return { error };
  }
}
