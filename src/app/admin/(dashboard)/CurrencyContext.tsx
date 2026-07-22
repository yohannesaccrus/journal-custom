"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { CURRENCIES, DEFAULT_CURRENCY } from "@/lib/currency";

const STORAGE_KEY = "sanaya-admin-currency";

interface CurrencyContextValue {
  currency: string;
  setCurrency: (code: string) => void;
}

const CurrencyContext = createContext<CurrencyContextValue>({
  currency: DEFAULT_CURRENCY,
  setCurrency: () => {},
});

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currency, setCurrencyState] = useState(DEFAULT_CURRENCY);

  // Restore after mount (not during the initial render) so server and
  // client agree on the very first paint — no hydration mismatch — then
  // apply whatever was persisted from a previous visit.
  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored && CURRENCIES[stored] && stored !== currency) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time restore of a persisted preference, not derivable at initial render without a hydration mismatch
      setCurrencyState(stored);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount only
  }, []);

  function setCurrency(code: string) {
    setCurrencyState(code);
    window.localStorage.setItem(STORAGE_KEY, code);
  }

  return <CurrencyContext.Provider value={{ currency, setCurrency }}>{children}</CurrencyContext.Provider>;
}

export function useCurrency() {
  return useContext(CurrencyContext);
}
