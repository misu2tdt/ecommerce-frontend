import type { VndAmount } from "@/types/catalog";

const vndFormatter = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

export function formatVnd(amount: VndAmount): string {
  return vndFormatter.format(amount);
}

export function formatPriceRange(
  minimum: VndAmount | null,
  maximum: VndAmount | null,
): string {
  if (minimum === null || maximum === null) return "Price unavailable";
  if (minimum === maximum) return formatVnd(minimum);
  return `${formatVnd(minimum)} – ${formatVnd(maximum)}`;
}
