import Link from "next/link";

import { buttonStyles } from "@/components/ui/button";
interface FeedbackStateProps {
  title: string;
  description: string;
  actionHref?: string;
  actionLabel?: string;
}

export function FeedbackState({
  title,
  description,
  actionHref,
  actionLabel,
}: FeedbackStateProps) {
  return (
    <div className="rounded-md border border-line bg-surface px-6 py-12 text-center">
      <h2 className="text-title font-semibold text-brand">{title}</h2>
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
