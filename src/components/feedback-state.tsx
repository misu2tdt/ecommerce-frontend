import Link from "next/link";

import { buttonStyles } from "@/components/ui/button";
interface FeedbackStateProps {
  title: string;
  description: string;
  actionHref?: string;
  actionLabel?: string;
  // "h1" when the message is the whole page (a missing page, a failed load),
  // "h2" when it sits inside a page that already has its own h1.
  as?: "h1" | "h2";
}

export function FeedbackState({
  title,
  description,
  actionHref,
  actionLabel,
  as: Heading = "h2",
}: FeedbackStateProps) {
  return (
    <div className="rounded-md border border-line bg-surface px-6 py-12 text-center">
      <Heading className="text-title font-semibold text-brand">{title}</Heading>
      <p className="mx-auto mt-3 max-w-xl text-body text-neutral-600">
        {description}
      </p>
      {actionHref && actionLabel && (
        <Link
          href={actionHref}
          className={buttonStyles({ variant: "secondary", size: "md", className: "mt-6" })}
        >
          {actionLabel}
        </Link>
      )}
    </div>
  );
}
