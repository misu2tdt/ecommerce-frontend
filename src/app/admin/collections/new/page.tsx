import type { Metadata } from "next";
import Link from "next/link";
import { CollectionForm } from "@/components/collection-form";

export const metadata: Metadata = { title: "Create Collection" };

export default function NewCollectionPage() {
  return (
    <>
      <Link
        href="/admin/collections"
        className="font-semibold text-brand underline focus-visible:outline-2 focus-visible:outline-brand"
      >
        &larr; Collections
      </Link>
      <div className="mt-5 rounded-md border border-line bg-surface p-6 sm:p-8">
        <h2 className="text-heading font-bold text-brand-strong">Create collection</h2>
        <p className="mt-2 text-neutral-600">
          Save the details first; you choose its products on the next screen.
        </p>
        <div className="mt-8">
          <CollectionForm />
        </div>
      </div>
    </>
  );
}
