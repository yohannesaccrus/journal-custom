"use client";

import { createContext, useContext, useEffect, useState } from "react";

export type PriceCategory = "journal" | "charm" | "pouch";

interface CurrencyContextValue {
  /** ISO currency code the visitor's market actually uses, e.g. "AUD" -- "EUR" while loading or if the market couldn't be resolved. */
  currency: string;
}

const CurrencyContext = createContext<CurrencyContextValue>({ currency: "EUR" });

const DEFAULT_MULTIPLIERS: Record<PriceCategory, number> = { journal: 1, charm: 1, pouch: 1 };

/**
 * The customizer no longer lets a visitor pick their own display currency --
 * client feedback was that the module should show "the Shopify price for the
 * visitor's market, just like the rest of the site does" instead. `country`
 * comes from the theme embed (`jc-embed.liquid`), which already knows the
 * visitor's market via Shopify's own `localization.country` -- same value
 * the rest of the storefront uses. One lookup here gets the EUR->market
 * multiplier per product family (see `fetchMarketPrice`) so every price
 * shown matches checkout, even when journal/charm/pouch have different
 * per-market price overrides in Shopify Markets.
 */
export function CurrencyProvider({ country, children }: { country?: string; children: React.ReactNode }) {
  const [state, setState] = useState<{ currency: string; multipliers: Record<PriceCategory, number> }>({
    currency: "EUR",
    multipliers: DEFAULT_MULTIPLIERS,
  });

  useEffect(() => {
    if (!country) return;
    let cancelled = false;
    fetch(`/api/market-currency?country=${encodeURIComponent(country)}`)
      .then((res) => res.json())
      .then((data: { currencyCode: string; multipliers: Record<PriceCategory, number> }) => {
        if (!cancelled) setState({ currency: data.currencyCode, multipliers: data.multipliers });
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
      <MultiplierContext.Provider value={state.multipliers}>{children}</MultiplierContext.Provider>
    </CurrencyContext.Provider>
  );
}

const MultiplierContext = createContext<Record<PriceCategory, number>>(DEFAULT_MULTIPLIERS);

export function useCurrency() {
  return useContext(CurrencyContext);
}

/** `format(amountEUR, category)` — every price in the customizer is computed
 * in EUR (Shopify's base currency); this converts + formats it into the
 * visitor's market currency using the live per-family multiplier from
 * `CurrencyProvider` (journal/charm/pouch can each have their own market
 * price override in Shopify Markets, so the right category must be passed).
 * `formatConverted(amount)` formats an amount that's already been converted
 * (e.g. a total summed from several already-converted line amounts) without
 * multiplying it again. */
export function useCurrencyFormat() {
  const { currency } = useCurrency();
  const multipliers = useContext(MultiplierContext);
  const formatConverted = (amount: number) => new Intl.NumberFormat(undefined, { style: "currency", currency }).format(amount);
  return {
    currency,
    format: (amountEUR: number, category: PriceCategory = "journal") => formatConverted(amountEUR * multipliers[category]),
    formatConverted,
    multipliers,
  };
}
