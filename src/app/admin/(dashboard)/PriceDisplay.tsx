"use client";

import { formatAsCurrency } from "@/lib/currency";
import { useCurrency } from "./CurrencyContext";

/** Renders a EUR amount converted + formatted in whatever currency is currently selected. */
export function PriceDisplay({ amountEUR, className }: { amountEUR: number; className?: string }) {
  const { currency } = useCurrency();
  return <span className={className}>{formatAsCurrency(amountEUR, currency)}</span>;
}
