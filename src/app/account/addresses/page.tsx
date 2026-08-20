import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AddressForm } from "@/components/address-form";
import { AddressMutationControls } from "@/components/address-mutation-controls";
import { AddressSummary } from "@/components/address-summary";
import { FeedbackState } from "@/components/feedback-state";
import { getAddresses } from "@/features/addresses/api";
import { buildLoginHref, safeInternalPath } from "@/features/auth/redirects";
import { ApiError, apiErrorMessage } from "@/lib/api";
import type { Address } from "@/types/address";

export const metadata: Metadata = {
  title: "Saved addresses",
  description: "Manage your Evergreen Store shipping addresses.",
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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-700">
            Your account
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
            Saved addresses
          </h1>
          <p className="mt-3 text-slate-600">
            These addresses can be selected during authenticated checkout.
          </p>
        </div>
        {returnPath !== "/account/addresses" && (
          <Link
            href={returnPath}
            className="inline-flex min-h-11 items-center justify-center rounded-lg border border-emerald-800 px-4 py-2 font-semibold text-emerald-800 hover:bg-emerald-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800"
          >
            Return to checkout
          </Link>
        )}
      </div>

      <div className="mt-8 grid gap-5 lg:grid-cols-2">
        {addresses.map((address) => (
          <article
            key={address.id}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
          >
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-bold text-slate-950">
                {address.label ?? "Saved address"}
              </h2>
              {address.isDefault && (
                <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-800">
                  Default
                </span>
              )}
            </div>
            <div className="mt-3">
              <AddressSummary address={address} />
            </div>
            <details className="mt-5 rounded-xl border border-slate-200 p-4">
              <summary className="cursor-pointer font-semibold text-emerald-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800">
                Edit address
              </summary>
              <div className="mt-5 border-t border-slate-200 pt-5">
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
        <p className="mt-8 rounded-xl border border-slate-200 bg-slate-50 px-5 py-6 text-slate-600">
          You do not have a saved address yet. Add one below to prepare for
          checkout.
        </p>
      )}

      <section className="mt-10 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        <h2 className="text-2xl font-bold text-slate-950">Add an address</h2>
        <p className="mt-2 text-sm text-slate-600">
          Optional fields may be left blank. Country uses a two-letter code.
        </p>
        <div className="mt-6">
          <AddressForm mode="create" returnPath="/account/addresses" />
        </div>
      </section>

      <p className="mt-6 text-sm text-slate-500">
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
