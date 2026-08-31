"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { fetchCartQuote } from "@/features/promotions/actions";
import { formatVnd } from "@/lib/money";
import type { CartQuoteResponse } from "@/types/promotions";

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
          className="block text-xs font-bold uppercase tracking-wider text-slate-700"
        >
          Promo code
        </label>
        {appliedQuote?.coupon ? (
          <div className="mt-2 flex items-center justify-between rounded-xl border border-emerald-300 bg-emerald-50/80 px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-6 items-center rounded-md bg-emerald-700 px-2 font-mono text-xs font-bold text-white">
                {appliedQuote.coupon.code}
              </span>
              <span className="text-xs font-semibold text-emerald-900">
                {appliedQuote.coupon.name}
              </span>
            </div>
            <button
              type="button"
              onClick={handleRemove}
              className="text-xs font-bold text-slate-500 hover:text-rose-600 focus-visible:outline-2 focus-visible:outline-emerald-800"
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
              className="min-w-0 flex-1 rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm font-semibold uppercase tracking-wider text-slate-900 placeholder:text-slate-400 focus:border-emerald-700 focus:outline-none focus:ring-1 focus:ring-emerald-700 disabled:bg-slate-100"
            />
            <button
              type="button"
              onClick={() => applyCode(couponCode)}
              disabled={isPending || !couponCode.trim()}
              className="shrink-0 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white shadow-xs transition hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
            >
              {isPending ? "Applying..." : "Apply"}
            </button>
          </div>
        )}

        {errorMessage && (
          <p role="alert" className="mt-2 text-xs font-medium text-rose-600">
            {errorMessage}
          </p>
        )}
      </div>

      {/* Pricing Summary Breakdown */}
      {showSummary && (
        <div className="space-y-2.5 border-t border-slate-200 pt-4 text-sm">
          <div className="flex justify-between text-slate-600">
            <span>Subtotal</span>
            <span>{formatVnd(currentSubtotal)}</span>
          </div>
          {currentDiscount > 0 && (
            <div className="flex justify-between font-semibold text-emerald-700">
              <span>Promotion discount</span>
              <span>-{formatVnd(currentDiscount)}</span>
            </div>
          )}
          <div className="flex items-end justify-between border-t border-slate-200 pt-3">
            <span className="text-base font-bold text-slate-950">Total</span>
            <span className="text-2xl font-black text-emerald-950">
              {formatVnd(currentTotal)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
