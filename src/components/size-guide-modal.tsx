"use client";

import { useEffect, useRef, useState } from "react";

import { buttonStyles } from "@/components/ui/button";
interface SizeGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  categoryName?: string;
}

export function SizeGuideModal({
  isOpen,
  onClose,
  categoryName = "Apparel",
}: SizeGuideModalProps) {
  const isBottoms =
    categoryName.toLowerCase().includes("pants") ||
    categoryName.toLowerCase().includes("shorts");

  const [viewSection, setViewSection] = useState<"tops" | "bottoms">(() =>
    isBottoms ? "bottoms" : "tops",
  );

  const dialogRef = useRef<HTMLDivElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const previousActiveElementRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    previousActiveElementRef.current = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const focusTimer = setTimeout(() => {
      closeButtonRef.current?.focus();
    }, 50);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }

      if (e.key === "Tab" && dialogRef.current) {
        const focusableElements = dialogRef.current.querySelectorAll<HTMLElement>(
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
      previousActiveElementRef.current?.focus();
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="size-guide-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-neutral-900/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Dialog Content */}
      <div
        ref={dialogRef}
        className="relative z-10 w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-md bg-surface p-6 shadow-2xl sm:p-8"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-line pb-4">
          <div>
            <h2
              id="size-guide-modal-title"
              className="text-title font-bold tracking-tight text-brand sm:text-heading"
            >
              Size & Fit Guide
            </h2>
            <p className="mt-1 text-body-sm text-neutral-600">
              General garment measurements for standard fit guidance.
            </p>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Close size guide"
            className="rounded-md p-2 text-neutral-500 hover:bg-brand-soft hover:text-neutral-700 focus-visible:outline-2 focus-visible:outline-brand"
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

        {/* View Switcher Controls */}
        <div className="mt-6 flex gap-2 border-b border-line pb-3">
          <button
            type="button"
            aria-pressed={viewSection === "tops"}
            onClick={() => setViewSection("tops")}
            className={`rounded-md px-4 py-2 text-body-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-brand ${
              viewSection === "tops"
                ? "bg-brand text-white"
                : "bg-brand-soft text-neutral-700 hover:bg-neutral-200"
            }`}
          >
            Tops & Outerwear
          </button>
          <button
            type="button"
            aria-pressed={viewSection === "bottoms"}
            onClick={() => setViewSection("bottoms")}
            className={`rounded-md px-4 py-2 text-body-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-brand ${
              viewSection === "bottoms"
                ? "bg-brand text-white"
                : "bg-brand-soft text-neutral-700 hover:bg-neutral-200"
            }`}
          >
            Pants & Shorts
          </button>
        </div>

        {/* Measurement Tables */}
        <div className="mt-6">
          {viewSection === "tops" ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-body-sm text-neutral-700">
                <thead className="border-b border-line bg-surface-muted text-caption uppercase font-bold text-neutral-600">
                  <tr>
                    <th scope="col" className="px-4 py-3">Size</th>
                    <th scope="col" className="px-4 py-3">Chest (cm)</th>
                    <th scope="col" className="px-4 py-3">Length (cm)</th>
                    <th scope="col" className="px-4 py-3">Shoulder (cm)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 font-normal">
                  <tr>
                    <td className="px-4 py-3 font-bold text-brand">S</td>
                    <td className="px-4 py-3">92 - 96</td>
                    <td className="px-4 py-3">68</td>
                    <td className="px-4 py-3">43</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-bold text-brand">M</td>
                    <td className="px-4 py-3">97 - 101</td>
                    <td className="px-4 py-3">70</td>
                    <td className="px-4 py-3">45</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-bold text-brand">L</td>
                    <td className="px-4 py-3">102 - 107</td>
                    <td className="px-4 py-3">72</td>
                    <td className="px-4 py-3">47</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-bold text-brand">XL</td>
                    <td className="px-4 py-3">108 - 113</td>
                    <td className="px-4 py-3">74</td>
                    <td className="px-4 py-3">49</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-bold text-brand">2XL / XXL</td>
                    <td className="px-4 py-3">114 - 120</td>
                    <td className="px-4 py-3">76</td>
                    <td className="px-4 py-3">51</td>
                  </tr>
                </tbody>
              </table>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-body-sm text-neutral-700">
                <thead className="border-b border-line bg-surface-muted text-caption uppercase font-bold text-neutral-600">
                  <tr>
                    <th scope="col" className="px-4 py-3">Waist Size</th>
                    <th scope="col" className="px-4 py-3">Waist (cm)</th>
                    <th scope="col" className="px-4 py-3">Hip (cm)</th>
                    <th scope="col" className="px-4 py-3">Inseam (cm)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 font-normal">
                  <tr>
                    <td className="px-4 py-3 font-bold text-brand">28 (S)</td>
                    <td className="px-4 py-3">71 - 74</td>
                    <td className="px-4 py-3">90 - 93</td>
                    <td className="px-4 py-3">76</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-bold text-brand">30 (M)</td>
                    <td className="px-4 py-3">76 - 79</td>
                    <td className="px-4 py-3">95 - 98</td>
                    <td className="px-4 py-3">77</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-bold text-brand">32 (L)</td>
                    <td className="px-4 py-3">81 - 84</td>
                    <td className="px-4 py-3">100 - 103</td>
                    <td className="px-4 py-3">78</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-bold text-brand">34 (XL)</td>
                    <td className="px-4 py-3">86 - 89</td>
                    <td className="px-4 py-3">105 - 108</td>
                    <td className="px-4 py-3">79</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-bold text-brand">36 (2XL)</td>
                    <td className="px-4 py-3">91 - 95</td>
                    <td className="px-4 py-3">110 - 114</td>
                    <td className="px-4 py-3">80</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* General Measuring Tips */}
        <div className="mt-6 rounded-md bg-surface-muted p-4 text-body-sm text-neutral-600 border border-line">
          <p className="font-semibold text-neutral-800">Measuring Tips:</p>
          <ul className="mt-1 list-disc pl-4 space-y-1">
            <li><strong>Chest:</strong> Measure around the fullest part of your chest, keeping the tape horizontal.</li>
            <li><strong>Waist:</strong> Measure around your natural waistline where your waistband typically sits.</li>
            <li><strong>Note:</strong> Always follow the specific care and fit instructions on the garment label.</li>
          </ul>
        </div>

        {/* Footer */}
        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className={buttonStyles({ variant: "primary", size: "md" })}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
