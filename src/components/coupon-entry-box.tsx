"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { fetchCartQuote } from "@/features/promotions/actions";
import { formatVnd } from "@/lib/money";
import type { CartQuoteResponse } from "@/types/promotions";

import { buttonStyles } from "@/components/ui/button";
import { fieldStyles } from "@/components/ui/field";
interface CouponEntryBoxProps {
  initialSubtotal: number;
  onQuoteChange?: (quote: CartQuoteResponse | null) => void;
  showSummary?: boolean;
  className?: string;
  appliedCode?: string;
}

export function CouponEntryBox({
  initialSubtotal,
  onQuoteChange,
  showSummary = true,
  className = "",
  appliedCode = "",
}: CouponEntryBoxProps) {
  const [couponCode, setCouponCode] = useState(appliedCode);
  const [appliedQuote, setAppliedQuote] = useState<CartQuoteResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const autoAppliedRef = useRef(false);

  const applyCode = useCallback(
    (code: string) => {
      const trimmed = code.trim();
      if (!trimmed) {
        setErrorMessage("Please enter a promo code.");
        return;
      }
      setErrorMessage(null);

      startTransition(async () => {
        const result = await fetchCartQuote(trimmed);
        if (result.success) {
          setAppliedQuote(result.quote);
          setErrorMessage(null);
          onQuoteChange?.(result.quote);
        } else {
          setAppliedQuote(null);
          setErrorMessage(result.error);
          onQuoteChange?.(null);
        }
      });
    },
    [onQuoteChange],
  );

  useEffect(() => {
    if (appliedCode && !autoAppliedRef.current) {
      autoAppliedRef.current = true;
      applyCode(appliedCode);
    }
  }, [appliedCode, applyCode]);

  const handleRemove = () => {
    setCouponCode("");
    setAppliedQuote(null);
    setErrorMessage(null);
    onQuoteChange?.(null);
  };

  const currentSubtotal = appliedQuote ? appliedQuote.subtotal : initialSubtotal;
  const currentDiscount = appliedQuote ? appliedQuote.discount : 0;
  const currentTotal = appliedQuote ? appliedQuote.total : initialSubtotal;

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Hidden input for parent forms (e.g. CheckoutForm) */}
      <input
        type="hidden"
        name="couponCode"
        value={appliedQuote?.coupon?.code ?? ""}
      />

      {/* Coupon Application Container (DIV instead of FORM to prevent nested forms) */}
      <div>
        <label
          htmlFor="promo-code-input"
          className="block uppercase text-neutral-700 text-caption font-semibold tracking-eyebrow"
        >
          Promo code
        </label>
        {appliedQuote?.coupon ? (
          <div className="mt-2 flex items-center justify-between rounded-md border border-success/30 bg-success-soft px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-6 items-center rounded-md bg-brand px-2 font-mono text-body-sm font-bold text-white">
                {appliedQuote.coupon.code}
              </span>
              <span className="text-body-sm font-semibold text-brand-strong">
                {appliedQuote.coupon.name}
              </span>
            </div>
            <button
              type="button"
              onClick={handleRemove}
              className="text-body-sm font-bold text-neutral-600 hover:text-red-600 focus-visible:outline-2 focus-visible:outline-brand"
            >
              Remove
            </button>
          </div>
        ) : (
          <div className="mt-2 flex gap-2">
            <input
              id="promo-code-input"
              type="text"
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  applyCode(couponCode);
                }
              }}
              placeholder="e.g. WELCOME10"
              disabled={isPending}
              className={fieldStyles("min-w-0 flex-1 uppercase")}
            />
            <button
              type="button"
              onClick={() => applyCode(couponCode)}
              disabled={isPending || !couponCode.trim()}
              className={buttonStyles({ variant: "primary", size: "md", className: "shrink-0" })}
            >
              {isPending ? "Applying..." : "Apply"}
            </button>
          </div>
        )}

        {errorMessage && (
          <p role="alert" className="mt-2 text-body-sm font-normal text-red-600">
            {errorMessage}
          </p>
        )}
      </div>

      {/* Pricing Summary Breakdown */}
      {showSummary && (
        <div className="space-y-2.5 border-t border-line pt-4 text-body-sm">
          <div className="flex justify-between text-neutral-600">
            <span>Subtotal</span>
            <span>{formatVnd(currentSubtotal)}</span>
          </div>
          {currentDiscount > 0 && (
            <div className="flex justify-between font-semibold text-success">
              <span>Promotion discount</span>
              <span>-{formatVnd(currentDiscount)}</span>
            </div>
          )}
          <div className="flex items-end justify-between border-t border-line pt-3">
            <span className="text-body font-bold text-brand-strong">Total</span>
            <span className="text-heading font-bold text-brand-strong">
              {formatVnd(currentTotal)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
