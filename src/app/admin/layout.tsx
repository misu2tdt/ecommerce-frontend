import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminNav } from "@/components/admin-nav";
import { FeedbackState } from "@/components/feedback-state";
import { getCurrentUser } from "@/features/auth/current-user";
import { buildLoginHref } from "@/features/auth/redirects";
import { apiErrorMessage } from "@/lib/api";

import { Eyebrow } from "@/components/ui/eyebrow";
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
      <section className="mx-auto max-w-3xl px-6 py-16">
        <FeedbackState title="ADMIN access required" description="Your verified account does not have permission to use catalog administration." />
        <Link href="/" className="mt-6 inline-block font-semibold text-brand underline focus-visible:outline-2 focus-visible:outline-brand">Return to storefront</Link>
      </section>
    );
  }
  return (
    <div className="min-h-full bg-neutral-100/70">
      <header className="border-b border-white/10 bg-brand-strong text-white">
        <div className="mx-auto max-w-7xl px-6 py-7"><Eyebrow className="text-neutral-300">Verified ADMIN</Eyebrow><h1 className="mt-1 font-bold tracking-tight text-heading">Catalog administration</h1><div className="mt-5"><AdminNav /></div></div>
      </header>
      <div className="mx-auto max-w-7xl px-6 py-10">{children}</div>
    </div>
  );
}

function AdminAccessError({ error }: { error: unknown }) {
  return <section className="mx-auto max-w-3xl px-6 py-16"><FeedbackState title="ADMIN access unavailable" description={apiErrorMessage(error)} /></section>;
}
