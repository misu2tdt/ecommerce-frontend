"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import type { CatalogFilterOptions } from "@/types/catalog";
import type { ProductFilters } from "@/features/catalog/api";
import { countActiveFilters } from "@/features/catalog/search-params";
import { CatalogSidebar } from "./catalog-sidebar";

interface MobileFilterDrawerProps {
  filters: ProductFilters;
  options: CatalogFilterOptions;
}

export function MobileFilterDrawer(props: MobileFilterDrawerProps) {
  return (
    <Suspense fallback={<MobileFilterTriggerFallback filters={props.filters} />}>
      <MobileFilterDrawerContent {...props} />
    </Suspense>
  );
}

function MobileFilterTriggerFallback({ filters }: { filters: ProductFilters }) {
  const activeCount = countActiveFilters(filters);
  return (
    <div className="lg:hidden">
      <button
        type="button"
        disabled
        aria-label="Open filter drawer"
        className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 shadow-sm opacity-60"
      >
        <svg
          className="h-4 w-4 text-slate-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
          />
        </svg>
        <span>Filters</span>
        {activeCount > 0 && (
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-700 text-[10px] font-bold text-white">
            {activeCount}
          </span>
        )}
      </button>
    </div>
  );
}

function MobileFilterDrawerContent({ filters, options }: MobileFilterDrawerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const drawerRef = useRef<HTMLDivElement | null>(null);
  const previouslyFocusedElementRef = useRef<HTMLElement | null>(null);
  const previousRouteKeyRef = useRef<string | null>(null);

  const pathname = usePathname();
  const searchParams = useSearchParams();
  const routeKey = `${pathname}?${searchParams.toString()}`;

  // Close drawer on route/filter changes and restore focus if drawer was open
  useEffect(() => {
    if (previousRouteKeyRef.current === null) {
      previousRouteKeyRef.current = routeKey;
      return;
    }

    if (previousRouteKeyRef.current !== routeKey) {
      previousRouteKeyRef.current = routeKey;
      if (isOpen) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setIsOpen(false);
        requestAnimationFrame(() => {
          (previouslyFocusedElementRef.current ?? triggerRef.current)?.focus();
        });
      }
    }
  }, [routeKey, isOpen]);

  // Handle open focus, body scroll lock, and key listeners
  useEffect(() => {
    if (!isOpen) return;

    previouslyFocusedElementRef.current = document.activeElement as HTMLElement | null;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // Move focus inside dialog
    const focusTimer = setTimeout(() => {
      closeButtonRef.current?.focus();
    }, 50);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
        (previouslyFocusedElementRef.current ?? triggerRef.current)?.focus();
        return;
      }

      if (e.key === "Tab" && drawerRef.current) {
        const focusableElements = drawerRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        );
        if (focusableElements.length === 0) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement?.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement?.focus();
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      clearTimeout(focusTimer);
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const handleClose = () => {
    setIsOpen(false);
    (previouslyFocusedElementRef.current ?? triggerRef.current)?.focus();
  };

  const activeCount = countActiveFilters(filters);

  return (
    <div className="lg:hidden">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen(true)}
        aria-expanded={isOpen}
        aria-controls="mobile-filter-dialog"
        className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-700"
      >
        <svg
          className="h-4 w-4 text-slate-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
          />
        </svg>
        <span>Filters</span>
        {activeCount > 0 && (
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-700 text-[10px] font-bold text-white">
            {activeCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          id="mobile-filter-dialog"
          role="dialog"
          aria-modal="true"
          aria-labelledby="mobile-filter-drawer-title"
          className="fixed inset-0 z-50 flex"
        >
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity"
            onClick={handleClose}
            aria-hidden="true"
          />

          {/* Drawer content */}
          <div
            ref={drawerRef}
            className="relative ml-auto flex h-full w-full max-w-xs flex-col bg-white shadow-2xl overflow-hidden"
          >
            {/* Drawer Header */}
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div className="flex items-center gap-2">
                <h2
                  id="mobile-filter-drawer-title"
                  className="text-base font-bold text-slate-900"
                >
                  Filters
                </h2>
                {activeCount > 0 && (
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">
                    {activeCount} active
                  </span>
                )}
              </div>
              <button
                ref={closeButtonRef}
                type="button"
                onClick={handleClose}
                aria-label="Close filters"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-700"
              >
                <svg
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* Drawer Body */}
            <div className="flex-1 overflow-y-auto px-5 py-6">
              <CatalogSidebar
                filters={filters}
                options={options}
                idPrefix="mobile-filter"
              />
            </div>

            {/* Drawer Footer */}
            <div className="border-t border-slate-200 p-4 bg-slate-50">
              <button
                type="button"
                onClick={handleClose}
                className="w-full rounded-lg bg-emerald-700 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-700"
              >
                View Results
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
