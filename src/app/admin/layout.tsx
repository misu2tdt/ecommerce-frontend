import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminNav } from "@/components/admin-nav";
import { FeedbackState } from "@/components/feedback-state";
import { getCurrentUser } from "@/features/auth/current-user";
import { buildLoginHref } from "@/features/auth/redirects";
import { apiErrorMessage } from "@/lib/api";

import { noIndex } from "@/lib/seo";
import { Eyebrow } from "@/components/ui/eyebrow";

// Staff pages stay out of search results.
export const metadata: Metadata = noIndex();

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  let user;
  try {
    user = await getCurrentUser();
  } catch (error) {
    return <AdminAccessError error={error} />;
  }
  if (!user) redirect(buildLoginHref("/admin"));
  if (user.role !== "admin") {
    return (
      <section className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-16">
        <FeedbackState as="h1" title="ADMIN access required" description="Your verified account does not have permission to use catalog administration." />
        <Link href="/" className="mt-6 inline-block font-semibold text-brand underline focus-visible:outline-2 focus-visible:outline-brand">Return to storefront</Link>
      </section>
    );
  }
  return (
    <div className="min-h-full bg-neutral-100/70">
      <header className="border-b border-white/10 bg-brand-strong text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-7"><Eyebrow className="text-neutral-300">Verified ADMIN</Eyebrow><h1 className="mt-1 font-bold tracking-tight text-heading">Catalog administration</h1><div className="mt-5"><AdminNav /></div></div>
      </header>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">{children}</div>
    </div>
  );
}

function AdminAccessError({ error }: { error: unknown }) {
  return <section className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-16"><FeedbackState as="h1" title="ADMIN access unavailable" description={apiErrorMessage(error)} /></section>;
}
