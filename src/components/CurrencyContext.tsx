"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

export type PriceCategory = "journal" | "charm" | "pouch";

interface CurrencyContextValue {
  /** ISO currency code the visitor's market actually uses, e.g. "AUD" -- "EUR" while loading or if the market couldn't be resolved. */
  currency: string;
}

const CurrencyContext = createContext<CurrencyContextValue>({ currency: "EUR" });

const DEFAULT_MULTIPLIERS: Record<PriceCategory, number> = { journal: 1, charm: 1, pouch: 1 };

const MultiplierContext = createContext<Record<PriceCategory, number>>(DEFAULT_MULTIPLIERS);
const VariantPricesContext = createContext<Record<string, number>>({});
const SetPricedVariantIdsContext = createContext<(ids: string[]) => void>(() => {});

/**
 * The customizer no longer lets a visitor pick their own display currency --
 * client feedback was that the module should show "the Shopify price for the
 * visitor's market, just like the rest of the site does" instead. `country`
 * comes from the theme embed (`jc-embed.liquid`), which already knows the
 * visitor's market via Shopify's own `localization.country` -- same value
 * the rest of the storefront uses.
 *
 * Two layers of accuracy: a per-family (journal/charm/pouch) EUR->market
 * multiplier (see `fetchMarketPrice`) covers every price shown while the
 * visitor is still picking options, but Shopify Markets often rounds each
 * variant's contextual price to a "nice" number rather than a pure FX
 * conversion -- so `useReportPricedVariants` lets whoever renders the final
 * total report exactly which variant ids are actually in the cart, and this
 * provider fetches THEIR exact contextual price so the total shown matches
 * checkout to the cent.
 */
export function CurrencyProvider({ country, children }: { country?: string; children: React.ReactNode }) {
  const [state, setState] = useState<{
    currency: string;
    multipliers: Record<PriceCategory, number>;
    variantPrices: Record<string, number>;
  }>({ currency: "EUR", multipliers: DEFAULT_MULTIPLIERS, variantPrices: {} });
  const [pricedVariantIds, setPricedVariantIds] = useState<string[]>([]);

  const variantIdsKey = pricedVariantIds.slice().sort().join(",");

  useEffect(() => {
    if (!country) return;
    let cancelled = false;
    const params = new URLSearchParams({ country });
    if (variantIdsKey) params.set("variantIds", variantIdsKey);
    fetch(`/api/market-currency?${params.toString()}`)
      .then((res) => res.json())
      .then((data: { currencyCode: string; multipliers: Record<PriceCategory, number>; variantPrices: Record<string, number> }) => {
        if (!cancelled) setState({ currency: data.currencyCode, multipliers: data.multipliers, variantPrices: data.variantPrices ?? {} });
      })
      .catch(() => {
        // Stay on the previous state already in memory.
      });
    return () => {
      cancelled = true;
    };
  }, [country, variantIdsKey]);

  const setPricedVariantIdsStable = useCallback((ids: string[]) => {
    setPricedVariantIds((prev) => {
      const prevKey = prev.slice().sort().join(",");
      const nextKey = ids.slice().sort().join(",");
      return prevKey === nextKey ? prev : ids;
    });
  }, []);

  return (
    <CurrencyContext.Provider value={{ currency: state.currency }}>
      <MultiplierContext.Provider value={state.multipliers}>
        <VariantPricesContext.Provider value={state.variantPrices}>
          <SetPricedVariantIdsContext.Provider value={setPricedVariantIdsStable}>{children}</SetPricedVariantIdsContext.Provider>
        </VariantPricesContext.Provider>
      </MultiplierContext.Provider>
    </CurrencyContext.Provider>
  );
}

/** Reports the exact variant ids currently in the cart/preview (journal + selected charms + pouch) so `CurrencyProvider` can fetch their real contextual price instead of estimating via multiplier. Call once from the component that owns the final total. */
export function useReportPricedVariants(variantIds: string[]) {
  const setPricedVariantIds = useContext(SetPricedVariantIdsContext);
  const key = variantIds.slice().sort().join(",");
  useEffect(() => {
    setPricedVariantIds(variantIds);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-report on the sorted key, not the array identity
  }, [key]);
}

export function useCurrency() {
  return useContext(CurrencyContext);
}

/**
 * `format(amountEUR, category)` converts+formats an EUR amount using the
 * live per-family multiplier -- fine for option deltas shown while picking
 * ("+€5 for animal print"). `formatConverted(amount)` formats an amount
 * that's already been converted (e.g. a total summed from `priceFor` calls).
 * `priceFor(variantId, fallbackEUR, category)` returns that variant's exact
 * reported contextual price when available, else the multiplier estimate --
 * use it for the number that actually has to match checkout.
 */
export function useCurrencyFormat() {
  const { currency } = useCurrency();
  const multipliers = useContext(MultiplierContext);
  const variantPrices = useContext(VariantPricesContext);
  const formatConverted = (amount: number) => new Intl.NumberFormat(undefined, { style: "currency", currency }).format(amount);
  return {
    currency,
    format: (amountEUR: number, category: PriceCategory = "journal") => formatConverted(amountEUR * multipliers[category]),
    formatConverted,
    multipliers,
    priceFor: (variantId: string | undefined, fallbackEUR: number, category: PriceCategory = "journal") =>
      (variantId ? variantPrices[variantId] : undefined) ?? fallbackEUR * multipliers[category],
  };
}
