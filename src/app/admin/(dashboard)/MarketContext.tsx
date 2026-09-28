"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { CZ_MARKETS, DEFAULT_MARKET, type CzMarket } from "@/lib/markets";

const STORAGE_KEY = "sanaya-admin-market";

interface MarketContextValue {
  market: CzMarket;
  setMarket: (market: CzMarket) => void;
}

const MarketContext = createContext<MarketContextValue>({ market: DEFAULT_MARKET, setMarket: () => {} });

const isMarket = (v: string | null): v is CzMarket => v === "BASE" || CZ_MARKETS.some((m) => m.country === v);

/** Which market's prices the Customizer Stock page shows; remembered per browser. */
export function MarketProvider({ children }: { children: React.ReactNode }) {
  const [market, setMarketState] = useState<CzMarket>(DEFAULT_MARKET);

  // Restored after mount, like the currency preference, so the first paint matches the server.
  useEffect(() => {
    let stored: string | null = null;
    try {
      stored = window.localStorage.getItem(STORAGE_KEY);
    } catch {}
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time restore of a persisted preference, not derivable at initial render without a hydration mismatch
    if (isMarket(stored)) setMarketState(stored);
  }, []);

  function setMarket(next: CzMarket) {
    setMarketState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {}
  }

  return <MarketContext.Provider value={{ market, setMarket }}>{children}</MarketContext.Provider>;
}

export function useMarket() {
  return useContext(MarketContext);
}
