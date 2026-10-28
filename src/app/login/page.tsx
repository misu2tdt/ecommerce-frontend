import type { Metadata } from "next";
import Link from "next/link";
import { LoginForm } from "@/components/login-form";
import { safeInternalPath } from "@/features/auth/redirects";

import { Eyebrow } from "@/components/ui/eyebrow";
import { SITE_NAME } from "@/lib/site";
export const metadata: Metadata = {
  title: "Login",
  description: `Sign in to your ${SITE_NAME} account.`,
};

type AuthSearchParams = Record<string, string | string[] | undefined>;

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<AuthSearchParams>;
}) {
  const query = await searchParams;
  const nextPath = safeInternalPath(query.next, "/");
  const registered = readFirst(query.registered) === "1";

  return (
    <section className="mx-auto flex max-w-6xl justify-center px-6 py-12 sm:py-16">
      <div className="w-full max-w-md rounded-md border border-line bg-surface p-6 sm:p-8">
        <Eyebrow>
          Welcome back
        </Eyebrow>
        <h1 className="mt-2 font-bold tracking-tight text-brand-strong text-display">
          Sign in
        </h1>
        <p className="mt-3 text-neutral-600">
          Access your account with your registered email and password.
        </p>

        {registered && (
          <p
            role="status"
            className="mt-5 rounded-md border border-success/30 bg-success-soft px-4 py-3 text-body-sm text-success"
          >
            Account created successfully. You can sign in now.
          </p>
        )}

        <LoginForm nextPath={nextPath} />

        <p className="mt-6 text-center text-body-sm text-neutral-600">
          New to {SITE_NAME}?{" "}
          <Link
            href={
              nextPath === "/"
                ? "/register"
                : `/register?${new URLSearchParams({ next: nextPath })}`
            }
            className="font-semibold text-brand hover:text-brand-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          >
            Create an account
          </Link>
        </p>
      </div>
    </section>
  );
}

function readFirst(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}
