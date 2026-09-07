"use client";

import { CurrencyProvider, useCurrencyFormat } from "@/components/CurrencyContext";

/** Compare-at / sale price for the base "Customized Journal" teaser, in EUR --
 * the store's base currency, same as every other EUR figure `CurrencyContext`
 * converts from. Converted client-side to the visitor's actual Shopify
 * market via the same `/api/market-currency` lookup the customizer uses, so
 * this landing page never shows a mislabeled currency again. */
const COMPARE_AT_EUR = 69;
const SALE_PRICE_EUR = 52;

function Prices() {
  const { format } = useCurrencyFormat();
  return (
    <p className="mt-2 text-lg">
      <span className="mr-2 text-[#8a887f] line-through">{format(COMPARE_AT_EUR)}</span>
      <span className="font-semibold">{format(SALE_PRICE_EUR)}</span>
    </p>
  );
}

export function PriceDisplay({ country }: { country?: string }) {
  return (
    <CurrencyProvider country={country}>
      <Prices />
    </CurrencyProvider>
  );
}
