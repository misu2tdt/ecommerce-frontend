import { FeedbackState } from "@/components/feedback-state";

export default function CollectionNotFound() {
  return (
    <section className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-16">
      <FeedbackState
        as="h1"
        title="Collection not found"
        description="This collection does not exist or is no longer available."
        actionHref="/products"
        actionLabel="Browse all products"
      />
    </section>
  );
}
