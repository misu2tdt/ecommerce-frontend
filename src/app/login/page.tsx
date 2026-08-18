import type { Metadata } from "next";
import Link from "next/link";
import { LoginForm } from "@/components/login-form";
import { safeInternalPath } from "@/features/auth/redirects";

export const metadata: Metadata = {
  title: "Login",
  description: "Sign in to your Evergreen Store account.",
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
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-emerald-700">
          Welcome back
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
          Sign in
        </h1>
        <p className="mt-3 text-slate-600">
          Access your account with your registered email and password.
        </p>

        {registered && (
          <p
            role="status"
            className="mt-5 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
          >
            Account created successfully. You can sign in now.
          </p>
        )}

        <LoginForm nextPath={nextPath} />

        <p className="mt-6 text-center text-sm text-slate-600">
          New to Evergreen Store?{" "}
          <Link
            href={
              nextPath === "/"
                ? "/register"
                : `/register?${new URLSearchParams({ next: nextPath })}`
            }
            className="font-semibold text-emerald-800 hover:text-emerald-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800"
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
