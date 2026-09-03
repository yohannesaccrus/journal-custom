"use client";

import { createContext, useContext, useEffect, useState } from "react";

interface CurrencyContextValue {
  /** ISO currency code the visitor's market actually uses, e.g. "AUD" -- "EUR" while loading or if the market couldn't be resolved. */
  currency: string;
}

const CurrencyContext = createContext<CurrencyContextValue>({ currency: "EUR" });

/**
 * The customizer no longer lets a visitor pick their own display currency --
 * client feedback was that the module should show "the Shopify price for the
 * visitor's market, just like the rest of the site does" instead. `country`
 * comes from the theme embed (`jc-embed.liquid`), which already knows the
 * visitor's market via Shopify's own `localization.country` -- same value
 * the rest of the storefront uses. One lookup here gets the EUR->market
 * multiplier (see `fetchMarketPrice`) so every price shown matches checkout.
 */
export function CurrencyProvider({ country, children }: { country?: string; children: React.ReactNode }) {
  const [state, setState] = useState<{ currency: string; multiplier: number }>({ currency: "EUR", multiplier: 1 });

  useEffect(() => {
    if (!country) return;
    let cancelled = false;
    fetch(`/api/market-currency?country=${encodeURIComponent(country)}`)
      .then((res) => res.json())
      .then((data: { currencyCode: string; multiplier: number }) => {
        if (!cancelled) setState({ currency: data.currencyCode, multiplier: data.multiplier });
      })
      .catch(() => {
        // Stay on the EUR/1x fallback already in state.
      });
    return () => {
      cancelled = true;
    };
  }, [country]);

  return (
    <CurrencyContext.Provider value={{ currency: state.currency }}>
      <MultiplierContext.Provider value={state.multiplier}>{children}</MultiplierContext.Provider>
    </CurrencyContext.Provider>
  );
}

const MultiplierContext = createContext(1);

export function useCurrency() {
  return useContext(CurrencyContext);
}

/** `format(amountEUR)` — every price in the customizer is computed in EUR
 * (Shopify's base currency); this converts + formats it into the visitor's
 * market currency using the live multiplier from `CurrencyProvider`. */
export function useCurrencyFormat() {
  const { currency } = useCurrency();
  const multiplier = useContext(MultiplierContext);
  return {
    currency,
    format: (amountEUR: number) =>
      new Intl.NumberFormat(undefined, { style: "currency", currency }).format(amountEUR * multiplier),
  };
}
