import { FeedbackState } from "@/components/feedback-state";

export default function ProductNotFound() {
  return (
    <section className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-16">
      <FeedbackState
        as="h1"
        title="Product not found"
        description="This product does not exist or is no longer active."
        actionHref="/products"
        actionLabel="Back to products"
      />
    </section>
  );
}
