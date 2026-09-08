"use client";

import { createContext, useContext, useMemo } from "react";
import { resolveLocale, translate, type Locale } from "@/lib/i18n";

const LocaleContext = createContext<Locale>("en");

interface LocaleProviderProps {
  /** Raw `?lang=` value from the URL (e.g. Shopify's `request.locale.iso_code`) — see JournalCustomizer's `lang` prop. */
  lang?: string;
  children: React.ReactNode;
}

export function LocaleProvider({ lang, children }: LocaleProviderProps) {
  const locale = useMemo(() => resolveLocale(lang), [lang]);
  return <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>;
}

export function useTranslation() {
  const locale = useContext(LocaleContext);
  return {
    locale,
    t: (key: string, params?: Record<string, string | number>) => translate(locale, key, params),
  };
}
