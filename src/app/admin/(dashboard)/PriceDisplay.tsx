"use client";

import { formatAsCurrency } from "@/lib/currency";
import { useCurrency } from "./CurrencyContext";

/** Renders an IDR amount converted + formatted in whatever currency is currently selected. */
export function PriceDisplay({ amountIDR, className }: { amountIDR: number; className?: string }) {
  const { currency } = useCurrency();
  return <span className={className}>{formatAsCurrency(amountIDR, currency)}</span>;
}
