import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { FeedbackState } from "@/components/feedback-state";
import { getCurrentUser } from "@/features/auth/current-user";
import { buildLoginHref } from "@/features/auth/redirects";
import { apiErrorMessage } from "@/lib/api";

export const metadata: Metadata = {
  title: "Account",
  description: "Your authenticated Evergreen Store account.",
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
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-emerald-700">
          Authenticated account
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
          Your account
        </h1>
        <p className="mt-3 text-slate-600">
          This identity was verified by the NestJS backend for this request.
        </p>

        <dl className="mt-8 grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl bg-slate-50 p-4">
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Email
            </dt>
            <dd className="mt-2 break-all font-semibold text-slate-950">
              {user.email}
            </dd>
          </div>
          <div className="rounded-xl bg-slate-50 p-4">
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Role
            </dt>
            <dd className="mt-2 font-semibold capitalize text-slate-950">
              {user.role}
            </dd>
          </div>
          <div className="rounded-xl bg-slate-50 p-4 sm:col-span-2">
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Account ID
            </dt>
            <dd className="mt-2 font-semibold text-slate-950">{user.id}</dd>
          </div>
        </dl>

        <div className="mt-8 border-t border-slate-200 pt-6">
          <Link
            href="/account/addresses"
            className="inline-flex min-h-11 items-center justify-center rounded-lg border border-emerald-800 px-4 py-2 font-semibold text-emerald-800 hover:bg-emerald-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800"
          >
            Manage saved addresses
          </Link>
        </div>
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
