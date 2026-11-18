"use client";

import Link from "next/link";
import {
  Suspense,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
} from "react";
import type { ProductFilters } from "@/features/catalog/api";
import {
  PRICE_PRESETS,
  brandChoices,
  categoryChoices,
  clearKey,
  colorChoices,
  facetCounts,
  setInStock,
  setPricePreset,
  setPriceRange,
  setSingle,
  sizeChoices,
  toggleMulti,
  type ParamsEdit,
} from "@/features/catalog/filter-edits";
import {
  buildCatalogHref,
  countActiveFilters,
} from "@/features/catalog/search-params";
import { PRICE_MAX_VND } from "@/lib/limits";
import type { CatalogFilterOptions } from "@/types/catalog";
import { buttonStyles } from "@/components/ui/button";
import { fieldStyles } from "@/components/ui/field";
import { useCatalogFilterUrl, usePriceDraft } from "./use-catalog-filter";

// The catalog's filters on a desktop screen (from lg; below that the drawer is
// used): one button per group, each opening a small panel under it, then "In stock
// only" and "Clear all". The count of results and the sort sit beside it (see
// the products page). Every choice changes the address and the server renders the
// page again (see use-catalog-filter.ts); nothing is filtered in the browser.
//
// The panels are always in the page (hidden until opened), so the price boxes and
// the options exist for anything that looks for them, and a closed panel costs
// nothing on screen. Only one is open at a time.

type Facet = "category" | "brand" | "size" | "color" | "price";

const FACET_LABEL: Record<Facet, string> = {
  category: "Category",
  brand: "Brand",
  size: "Size",
  color: "Color",
  price: "Price",
};

interface CatalogFilterBarProps {
  filters: ProductFilters;
  options: CatalogFilterOptions;
}

export function CatalogFilterBar(props: CatalogFilterBarProps) {
  return (
    <Suspense fallback={<FilterBarFallback {...props} />}>
      <FilterBar {...props} />
    </Suspense>
  );
}

const panelIdFor = (base: string, facet: Facet) => `${base}-${facet}-panel`;
const triggerIdFor = (base: string, facet: Facet) => `${base}-${facet}-trigger`;

function facetsOf(options: CatalogFilterOptions): Facet[] {
  return [
    "category",
    "brand",
    ...(options.sizes.length > 0 ? (["size"] as const) : []),
    ...(options.colors.length > 0 ? (["color"] as const) : []),
    "price",
  ];
}

function FilterBarFallback({ filters, options }: CatalogFilterBarProps) {
  const counts = facetCounts(filters);
  return (
    <div className="hidden lg:flex lg:flex-wrap lg:items-center lg:gap-2">
      {facetsOf(options).map((facet) => (
        <TriggerButton
          key={facet}
          label={FACET_LABEL[facet]}
          count={counts[facet]}
          open={false}
          disabled
        />
      ))}
    </div>
  );
}

function FilterBar({ filters, options }: CatalogFilterBarProps) {
  const base = useId();
  const { isPending, apply } = useCatalogFilterUrl();
  const price = usePriceDraft(filters.minPrice, filters.maxPrice);
  const [open, setOpen] = useState<Facet | null>(null);
  const barRef = useRef<HTMLDivElement | null>(null);
  const counts = facetCounts(filters);

  // While a panel is open: Escape closes it (and puts focus back on its button),
  // and so does a press anywhere outside the bar or focus moving out of it.
  useEffect(() => {
    if (open === null) return;
    const facet = open;
    const outside = (target: EventTarget | null) =>
      !barRef.current?.contains(target as Node | null);

    function onKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key !== "Escape") return;
      setOpen(null);
      if (barRef.current?.contains(document.activeElement)) {
        document.getElementById(triggerIdFor(base, facet))?.focus();
      }
    }
    function onPointerDown(event: PointerEvent) {
      if (outside(event.target)) setOpen(null);
    }
    function onFocusIn(event: FocusEvent) {
      if (outside(event.target)) setOpen(null);
    }

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("focusin", onFocusIn);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("focusin", onFocusIn);
    };
  }, [open, base]);

  // A panel opens under its button and normally lines up with its left edge. If
  // that would run past the right edge of the window, it lines up with the
  // button's right edge instead.
  useLayoutEffect(() => {
    if (open === null) return;
    const panel = document.getElementById(panelIdFor(base, open));
    if (!panel) return;
    panel.style.left = "0";
    panel.style.right = "auto";
    if (panel.getBoundingClientRect().right > window.innerWidth - 8) {
      panel.style.left = "auto";
      panel.style.right = "0";
    }
  }, [open, base]);

  function focusPanel(facet: Facet) {
    requestAnimationFrame(() => {
      const panel = document.getElementById(panelIdFor(base, facet));
      const target =
        panel?.querySelector<HTMLElement>('[aria-pressed="true"]') ??
        panel?.querySelector<HTMLElement>("button, input");
      target?.focus();
    });
  }

  function closeToTrigger(facet: Facet) {
    setOpen(null);
    document.getElementById(triggerIdFor(base, facet))?.focus();
  }

  function onTriggerClick(facet: Facet, event: MouseEvent<HTMLButtonElement>) {
    if (open === facet) {
      setOpen(null);
      return;
    }
    setOpen(facet);
    // Opened from the keyboard (Enter or Space): carry on inside the panel.
    if (event.detail === 0) focusPanel(facet);
  }

  function onTriggerKeyDown(facet: Facet, event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key !== "ArrowDown") return;
    event.preventDefault();
    setOpen(facet);
    focusPanel(facet);
  }

  // Arrow keys, Home and End move between the buttons of a panel. The price boxes
  // keep their own arrow keys.
  function onPanelKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if ((event.target as HTMLElement).tagName !== "BUTTON") return;
    const step =
      event.key === "ArrowDown" || event.key === "ArrowRight"
        ? 1
        : event.key === "ArrowUp" || event.key === "ArrowLeft"
          ? -1
          : 0;
    if (!step && event.key !== "Home" && event.key !== "End") return;
    const buttons = Array.from(
      event.currentTarget.querySelectorAll<HTMLElement>(
        'button:not([disabled]):not([aria-disabled="true"])',
      ),
    );
    const at = buttons.indexOf(event.target as HTMLElement);
    if (buttons.length === 0 || at === -1) return;
    event.preventDefault();
    const next =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? buttons.length - 1
          : (at + step + buttons.length) % buttons.length;
    buttons[next]?.focus();
  }

  // A choice that settles a group (one category, one brand, a price) closes its
  // panel; a size or a colour keeps it open for the next one. Choices wait while
  // the page is changing, so a second one is never built on the old address.
  function choose(edit: ParamsEdit, closes?: Facet) {
    if (isPending) return;
    apply(edit);
    if (closes) closeToTrigger(closes);
  }

  const optionClass = (selected: boolean) =>
    `flex min-h-11 w-full items-center rounded-md px-3 text-left text-body-sm transition focus-visible:outline-2 focus-visible:outline-brand ${
      selected
        ? "bg-brand-soft font-semibold text-brand-strong"
        : "text-neutral-700 hover:bg-surface-muted hover:text-brand"
    }`;
  const chipClass = (selected: boolean, shape: string) =>
    `inline-flex min-h-11 min-w-11 items-center justify-center border px-3 text-body-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${shape} ${
      selected
        ? "border-brand bg-brand text-white"
        : "border-field-border bg-surface text-neutral-800 hover:border-neutral-400 hover:bg-surface-muted"
    }`;
  const resetClass =
    "mt-3 inline-flex min-h-11 items-center rounded px-1 text-body-sm font-semibold text-brand underline underline-offset-2 hover:text-brand-strong focus-visible:outline-2 focus-visible:outline-brand";

  const panels: Record<Facet, ReactNode> = {
    category: (
      <ul className="flex flex-col gap-1">
        {categoryChoices(filters, options).map((choice) => (
          <li key={choice.value ?? "all"}>
            <button
              type="button"
              aria-pressed={choice.selected}
              aria-disabled={isPending || undefined}
              onClick={() => choose(setSingle("category", choice.value), "category")}
              className={optionClass(choice.selected)}
            >
              {choice.label}
            </button>
          </li>
        ))}
      </ul>
    ),
    brand: (
      <ul className="flex flex-col gap-1">
        {brandChoices(filters, options).map((choice) => (
          <li key={choice.value ?? "all"}>
            <button
              type="button"
              aria-pressed={choice.selected}
              aria-disabled={isPending || undefined}
              onClick={() => choose(setSingle("brand", choice.value), "brand")}
              className={optionClass(choice.selected)}
            >
              {choice.label}
            </button>
          </li>
        ))}
      </ul>
    ),
    size: (
      <>
        <div className="flex flex-wrap gap-2">
          {sizeChoices(filters, options).map((choice) => (
            <button
              key={choice.value}
              type="button"
              aria-pressed={choice.selected}
              aria-disabled={isPending || undefined}
              onClick={() =>
                choose(toggleMulti("size", filters.size ?? [], choice.value))
              }
              className={chipClass(choice.selected, "rounded-md uppercase")}
            >
              {choice.value}
            </button>
          ))}
        </div>
        {counts.size > 0 && (
          <button
            type="button"
            onClick={() => choose(clearKey("size"))}
            className={resetClass}
          >
            Reset sizes
          </button>
        )}
      </>
    ),
    color: (
      <>
        <div className="flex flex-wrap gap-2">
          {colorChoices(filters, options).map((choice) => (
            <button
              key={choice.value}
              type="button"
              aria-pressed={choice.selected}
              aria-disabled={isPending || undefined}
              onClick={() =>
                choose(toggleMulti("color", filters.color ?? [], choice.value))
              }
              className={chipClass(choice.selected, "rounded-full")}
            >
              {choice.value}
            </button>
          ))}
        </div>
        {counts.color > 0 && (
          <button
            type="button"
            onClick={() => choose(clearKey("color"))}
            className={resetClass}
          >
            Reset colors
          </button>
        )}
      </>
    ),
    price: (
      <>
        <div className="flex flex-wrap gap-2">
          {PRICE_PRESETS.map((preset) => (
            <button
              key={preset.label}
              type="button"
              aria-disabled={isPending || undefined}
              onClick={() => {
                price.reset();
                choose(setPricePreset(preset.min, preset.max), "price");
              }}
              className={chipClass(false, "rounded-md")}
            >
              {preset.label}
            </button>
          ))}
        </div>
        <form
          className="mt-3 space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            choose(setPriceRange(price.min, price.max), "price");
          }}
        >
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label htmlFor={`${base}-min-price-input`} className="sr-only">
                Minimum price in VND
              </label>
              <input
                id={`${base}-min-price-input`}
                type="number"
                min="0"
                max={PRICE_MAX_VND}
                step="10000"
                placeholder="Min ₫"
                value={price.min}
                onChange={(event) => price.setMin(event.target.value)}
                className={fieldStyles()}
              />
            </div>
            <div>
              <label htmlFor={`${base}-max-price-input`} className="sr-only">
                Maximum price in VND
              </label>
              <input
                id={`${base}-max-price-input`}
                type="number"
                min="0"
                max={PRICE_MAX_VND}
                step="10000"
                placeholder="Max ₫"
                value={price.max}
                onChange={(event) => price.setMax(event.target.value)}
                className={fieldStyles()}
              />
            </div>
          </div>
          <button
            type="submit"
            aria-disabled={isPending || undefined}
            className={buttonStyles({
              variant: "primary",
              size: "md",
              className: "w-full",
            })}
          >
            Apply Price
          </button>
        </form>
        {counts.price > 0 && (
          <button
            type="button"
            onClick={() => {
              price.reset();
              choose(clearKey("minPrice", "maxPrice"), "price");
            }}
            className={resetClass}
          >
            Reset price
          </button>
        )}
      </>
    ),
  };

  return (
    <div
      ref={barRef}
      role="group"
      aria-label="Catalog filters"
      aria-busy={isPending}
      className="hidden lg:flex lg:flex-wrap lg:items-center lg:gap-2"
    >
      {facetsOf(options).map((facet) => {
        const isOpen = open === facet;
        return (
          <div key={facet} className="relative">
            <TriggerButton
              id={triggerIdFor(base, facet)}
              label={FACET_LABEL[facet]}
              count={counts[facet]}
              open={isOpen}
              controls={panelIdFor(base, facet)}
              onClick={(event) => onTriggerClick(facet, event)}
              onKeyDown={(event) => onTriggerKeyDown(facet, event)}
            />
            <div
              id={panelIdFor(base, facet)}
              role="group"
              aria-label={`${FACET_LABEL[facet]} options`}
              hidden={!isOpen}
              onKeyDown={onPanelKeyDown}
              className="absolute left-0 top-full z-30 mt-2 max-h-[min(26rem,calc(100dvh-6rem))] w-72 max-w-[calc(100vw-2rem)] overflow-y-auto rounded-md border border-line bg-surface p-3 shadow-lg"
            >
              {panels[facet]}
            </div>
          </div>
        );
      })}

      <button
        type="button"
        aria-pressed={counts.inStock > 0}
        aria-disabled={isPending || undefined}
        onClick={() => choose(setInStock(counts.inStock === 0))}
        className={`inline-flex h-11 items-center rounded-md border px-3 text-body-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${
          counts.inStock > 0
            ? "border-brand bg-brand text-white"
            : "border-field-border bg-surface text-neutral-800 hover:border-neutral-400 hover:bg-surface-muted"
        }`}
      >
        In stock only
      </button>

      {countActiveFilters(filters) > 0 && (
        <Link
          href={buildCatalogHref({ sort: filters.sort })}
          aria-label="Clear all filters"
          className="inline-flex min-h-11 items-center rounded px-2 text-body-sm font-semibold text-brand underline underline-offset-2 hover:text-brand-strong focus-visible:outline-2 focus-visible:outline-brand"
        >
          Clear all
        </Link>
      )}
    </div>
  );
}

// The button of a group: its name, how many choices it has, and a small arrow.
function TriggerButton({
  label,
  count,
  open,
  disabled,
  id,
  controls,
  onClick,
  onKeyDown,
}: {
  label: string;
  count: number;
  open: boolean;
  disabled?: boolean;
  id?: string;
  controls?: string;
  onClick?: (event: MouseEvent<HTMLButtonElement>) => void;
  onKeyDown?: (event: KeyboardEvent<HTMLButtonElement>) => void;
}) {
  return (
    <button
      id={id}
      type="button"
      disabled={disabled}
      aria-expanded={open}
      aria-controls={controls}
      onClick={onClick}
      onKeyDown={onKeyDown}
      className={`inline-flex h-11 items-center gap-2 rounded-md border bg-surface px-3 text-body-sm font-semibold text-neutral-800 transition hover:border-neutral-400 hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-wait disabled:opacity-60 ${
        count > 0 || open ? "border-brand" : "border-field-border"
      }`}
    >
      <span>{label}</span>
      {count > 0 && (
        <>
          <span
            aria-hidden="true"
            className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-brand px-1.5 text-body-sm font-bold text-white"
          >
            {count}
          </span>
          <span className="sr-only">{`, ${count} selected`}</span>
        </>
      )}
      <svg
        aria-hidden="true"
        className={`h-4 w-4 text-neutral-600 transition-transform motion-reduce:transition-none ${
          open ? "rotate-180" : ""
        }`}
        viewBox="0 0 20 20"
        fill="currentColor"
      >
        <path
          fillRule="evenodd"
          d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
          clipRule="evenodd"
        />
      </svg>
    </button>
  );
}
