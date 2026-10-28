"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useId, useState, useTransition } from "react";

interface HeaderSearchProps {
  id?: string;
  onSearchSubmitted?: () => void;
  className?: string;
  placeholder?: string;
  autoFocus?: boolean;
}

export function HeaderSearch(props: HeaderSearchProps) {
  const generatedId = useId();
  const inputId = props.id || generatedId;

  return (
    <Suspense
      fallback={
        <HeaderSearchFallback
          id={inputId}
          className={props.className}
          placeholder={props.placeholder}
        />
      }
    >
      <HeaderSearchForm {...props} id={inputId} />
    </Suspense>
  );
}

function HeaderSearchFallback({
  id,
  className = "",
  placeholder = "Search shirts, pants, outerwear...",
}: {
  id: string;
  className?: string;
  placeholder?: string;
}) {
  return (
    <div className={`relative flex items-center ${className}`}>
      <label htmlFor={id} className="sr-only">
        Search catalog
      </label>
      <div className="relative w-full">
        <input
          id={id}
          type="search"
          placeholder={placeholder}
          disabled
          className="w-full rounded-md border border-field-border bg-surface-muted py-2.5 pl-9 pr-4 text-body text-brand placeholder:text-neutral-600 xl:py-2 xl:text-body-sm"
        />
        <svg
          aria-hidden="true"
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
          />
        </svg>
      </div>
    </div>
  );
}

function HeaderSearchForm({
  id,
  onSearchSubmitted,
  className = "",
  placeholder = "Search shirts, pants, outerwear...",
  autoFocus = false,
}: HeaderSearchProps & { id: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") || "";
  const [query, setQuery] = useState(initialQuery);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmed = query.trim();
    startTransition(() => {
      if (trimmed) {
        router.push(`/products?q=${encodeURIComponent(trimmed)}`);
      } else {
        router.push("/products");
      }
      onSearchSubmitted?.();
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      role="search"
      className={`relative flex items-center ${className}`}
    >
      <label htmlFor={id} className="sr-only">
        Search catalog
      </label>
      <div className="relative w-full">
        <input
          id={id}
          type="search"
          name="q"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          autoFocus={autoFocus}
          disabled={isPending}
          className="w-full rounded-md border border-field-border bg-surface-muted py-2.5 pl-9 pr-4 text-body text-brand placeholder:text-neutral-600 transition hover:bg-brand-soft focus:bg-surface focus:outline-2 focus:outline-offset-2 focus:outline-brand xl:py-2 xl:text-body-sm"
        />
        <svg
          aria-hidden="true"
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
          />
        </svg>
      </div>
      {query && (
        <button
          type="button"
          onClick={() => setQuery("")}
          aria-label="Clear search query"
          className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-1 text-neutral-500 hover:text-brand focus-visible:outline-2 focus-visible:outline-brand"
        >
          <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      )}
    </form>
  );
}
