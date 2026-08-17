import Link from "next/link";

interface FeedbackStateProps {
  title: string;
  description: string;
  actionHref?: string;
  actionLabel?: string;
}

export function FeedbackState({
  title,
  description,
  actionHref = "/products",
  actionLabel = "Try again",
}: FeedbackStateProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-6 py-12 text-center shadow-sm">
      <h2 className="text-xl font-semibold text-slate-900">{title}</h2>
      <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-600">
        {description}
      </p>
      <Link
        href={actionHref}
        className="mt-6 inline-flex min-h-11 items-center rounded-md border border-emerald-800 px-4 py-2 font-semibold text-emerald-800 hover:bg-emerald-50 focus-visible:outline-2 focus-visible:outline-emerald-800"
      >
        {actionLabel}
      </Link>
    </div>
  );
}
