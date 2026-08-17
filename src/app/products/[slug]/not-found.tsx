import { FeedbackState } from "@/components/feedback-state";

export default function ProductNotFound() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-16">
      <FeedbackState
        title="Product not found"
        description="This product does not exist or is no longer active."
        actionLabel="Back to products"
      />
    </section>
  );
}
