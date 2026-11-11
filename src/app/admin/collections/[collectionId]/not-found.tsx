import Link from "next/link";
import { FeedbackState } from "@/components/feedback-state";

export default function NotFound() {
  return (
    <>
      <FeedbackState
        title="Collection not found"
        description="This collection does not exist or is no longer available."
      />
      <Link
        href="/admin/collections"
        className="mt-5 inline-block font-semibold text-brand underline focus-visible:outline-2 focus-visible:outline-brand"
      >
        Return to Collections
      </Link>
    </>
  );
}
