/**
 * Countries the admin can show customizer prices for. Each one is priced by Shopify Markets
 * (its own currency, exchange rate, rounding and price lists), read as `contextualPricing` for
 * that country, so what the admin shows is what a shopper there sees. "BASE" is the product's
 * own price in the store currency, before any market.
 */
export const CZ_MARKETS = [
  { country: "ID", label: "Indonesia" },
  { country: "US", label: "United States" },
  { country: "FR", label: "France" },
  { country: "DE", label: "Germany" },
  { country: "SG", label: "Singapore" },
  { country: "MY", label: "Malaysia" },
  { country: "GB", label: "United Kingdom" },
  { country: "AU", label: "Australia" },
  { country: "JP", label: "Japan" },
  { country: "AE", label: "United Arab Emirates" },
] as const;

export type CzMarketCountry = (typeof CZ_MARKETS)[number]["country"];
export type CzMarket = CzMarketCountry | "BASE";
export const DEFAULT_MARKET: CzMarket = "ID";

/** "Rp 730.000" for rupiah, otherwise "38,83 USD" / "6.300 JPY" (no decimals when whole). */
export function formatMoney(amount: number, currency: string): string {
  const whole = Number.isInteger(amount);
  const n = new Intl.NumberFormat("id-ID", { minimumFractionDigits: whole ? 0 : 2, maximumFractionDigits: whole ? 0 : 2 }).format(amount);
  return currency === "IDR" ? `Rp ${n}` : `${n} ${currency}`;
}
