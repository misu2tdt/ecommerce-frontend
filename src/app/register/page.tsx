import type { Metadata } from "next";
import Link from "next/link";
import { RegisterForm } from "@/components/register-form";
import { safeInternalPath } from "@/features/auth/redirects";

import { Eyebrow } from "@/components/ui/eyebrow";
import { SITE_NAME } from "@/lib/site";
export const metadata: Metadata = {
  title: "Register",
  description: `Create a ${SITE_NAME} customer account.`,
};

type AuthSearchParams = Record<string, string | string[] | undefined>;

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<AuthSearchParams>;
}) {
  const query = await searchParams;
  const nextPath = safeInternalPath(query.next, "/");

  return (
    <section className="mx-auto flex max-w-6xl justify-center px-6 py-12 sm:py-16">
      <div className="w-full max-w-md rounded-md border border-line bg-surface p-6 sm:p-8">
        <Eyebrow>
          Customer account
        </Eyebrow>
        <h1 className="mt-2 font-bold tracking-tight text-brand-strong text-display">
          Create your account
        </h1>
        <p className="mt-3 text-neutral-600">
          Register with the email and password fields supported by the backend.
        </p>

        <RegisterForm nextPath={nextPath} />

        <p className="mt-6 text-center text-body-sm text-neutral-600">
          Already registered?{" "}
          <Link
            href={
              nextPath === "/"
                ? "/login"
                : `/login?${new URLSearchParams({ next: nextPath })}`
            }
            className="font-semibold text-brand hover:text-brand-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          >
            Sign in
          </Link>
        </p>
      </div>
    </section>
  );
}
