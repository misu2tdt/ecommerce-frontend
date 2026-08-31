"use client";

import { useState } from "react";

interface ProductAccordionsProps {
  description: string | null;
  categoryName?: string;
  brandName?: string | null;
}

export function ProductAccordions({
  description,
  categoryName = "Everyday Fashion",
  brandName,
}: ProductAccordionsProps) {
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    details: true,
    care: false,
    fit: false,
    shipping: false,
  });

  const toggleSection = (section: string) => {
    setOpenSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  return (
    <div className="mt-8 divide-y divide-slate-200 border-t border-b border-slate-200">
      {/* 1. Product Details */}
      <div>
        <h3>
          <button
            type="button"
            onClick={() => toggleSection("details")}
            aria-expanded={openSections.details}
            aria-controls="accordion-details"
            className="flex w-full items-center justify-between py-4 text-left font-semibold text-slate-900 transition hover:text-emerald-800 focus-visible:outline-2 focus-visible:outline-emerald-800"
          >
            <span>Product Details</span>
            <svg
              className={`h-4 w-4 text-slate-500 transition-transform duration-200 ${
                openSections.details ? "rotate-180" : ""
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>
        </h3>
        {openSections.details && (
          <div id="accordion-details" className="pb-4 text-sm leading-relaxed text-slate-600">
            <p>{description || "Product details are currently limited for this item."}</p>
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              <span className="rounded-md bg-slate-100 px-2.5 py-1 font-medium text-slate-700">
                Category: {categoryName}
              </span>
              {brandName && (
                <span className="rounded-md bg-slate-100 px-2.5 py-1 font-medium text-slate-700">
                  Brand: {brandName}
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 2. Materials & Care */}
      <div>
        <h3>
          <button
            type="button"
            onClick={() => toggleSection("care")}
            aria-expanded={openSections.care}
            aria-controls="accordion-care"
            className="flex w-full items-center justify-between py-4 text-left font-semibold text-slate-900 transition hover:text-emerald-800 focus-visible:outline-2 focus-visible:outline-emerald-800"
          >
            <span>General Care Guidance</span>
            <svg
              className={`h-4 w-4 text-slate-500 transition-transform duration-200 ${
                openSections.care ? "rotate-180" : ""
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>
        </h3>
        {openSections.care && (
          <div id="accordion-care" className="pb-4 text-sm leading-relaxed text-slate-600">
            <ul className="list-disc pl-5 space-y-1">
              <li>Always follow the specific care instructions printed on the garment label.</li>
              <li>Machine wash cold with like colors on a gentle cycle when applicable.</li>
              <li>Use mild detergent; avoid chlorine bleach or harsh fabric softeners.</li>
              <li>Tumble dry low or line dry in the shade to preserve garment shape and elasticity.</li>
            </ul>
          </div>
        )}
      </div>

      {/* 3. Fit Notes */}
      <div>
        <h3>
          <button
            type="button"
            onClick={() => toggleSection("fit")}
            aria-expanded={openSections.fit}
            aria-controls="accordion-fit"
            className="flex w-full items-center justify-between py-4 text-left font-semibold text-slate-900 transition hover:text-emerald-800 focus-visible:outline-2 focus-visible:outline-emerald-800"
          >
            <span>General Fit Notes</span>
            <svg
              className={`h-4 w-4 text-slate-500 transition-transform duration-200 ${
                openSections.fit ? "rotate-180" : ""
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>
        </h3>
        {openSections.fit && (
          <div id="accordion-fit" className="pb-4 text-sm leading-relaxed text-slate-600">
            <p>
              Standard everyday fit. Select your typical size for regular wear, or consider sizing up if you prefer a looser fit.
            </p>
          </div>
        )}
      </div>

      {/* 4. Orders & Support */}
      <div>
        <h3>
          <button
            type="button"
            onClick={() => toggleSection("shipping")}
            aria-expanded={openSections.shipping}
            aria-controls="accordion-shipping"
            className="flex w-full items-center justify-between py-4 text-left font-semibold text-slate-900 transition hover:text-emerald-800 focus-visible:outline-2 focus-visible:outline-emerald-800"
          >
            <span>Orders & Account Support</span>
            <svg
              className={`h-4 w-4 text-slate-500 transition-transform duration-200 ${
                openSections.shipping ? "rotate-180" : ""
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>
        </h3>
        {openSections.shipping && (
          <div id="accordion-shipping" className="pb-4 text-sm leading-relaxed text-slate-600">
            <p>
              View your order history and current order status from your account after checkout.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
