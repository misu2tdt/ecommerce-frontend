import type { Metadata } from "next";
import Link from "next/link";
import { RegisterForm } from "@/components/register-form";
import { safeInternalPath } from "@/features/auth/redirects";

export const metadata: Metadata = {
  title: "Register",
  description: "Create an Evergreen Store customer account.",
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
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-emerald-700">
          Customer account
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
          Create your account
        </h1>
        <p className="mt-3 text-slate-600">
          Register with the email and password fields supported by the backend.
        </p>

        <RegisterForm nextPath={nextPath} />

        <p className="mt-6 text-center text-sm text-slate-600">
          Already registered?{" "}
          <Link
            href={
              nextPath === "/"
                ? "/login"
                : `/login?${new URLSearchParams({ next: nextPath })}`
            }
            className="font-semibold text-emerald-800 hover:text-emerald-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800"
          >
            Sign in
          </Link>
        </p>
      </div>
    </section>
  );
}
