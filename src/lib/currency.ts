import currency from "currency.js";

/**
 * Shopify (and every price actually stored/saved) is always in IDR — this is
 * a *display* currency system for the admin: pick a currency, every price on
 * screen re-renders converted, editable fields convert back to IDR on save.
 *
 * Adding a new currency later is just one more entry here — `rateFromIDR` is
 * "how many units of this currency equal 1 IDR".
 */
export interface CurrencyConfig {
  code: string;
  symbol: string;
  label: string;
  decimals: number;
  /** How many units of this currency equal 1 IDR. */
  rateFromIDR: number;
  /** Decimal separator used when typing/displaying a fractional amount. */
  decimalSeparator: "." | ",";
  /** Thousands separator. */
  groupSeparator: "." | "," | " ";
  /** currency.js pattern — "!" is the symbol, "#" the number. */
  pattern: string;
}

export const CURRENCIES: Record<string, CurrencyConfig> = {
  IDR: {
    code: "IDR",
    symbol: "Rp",
    label: "Indonesian Rupiah",
    decimals: 0,
    rateFromIDR: 1,
    decimalSeparator: ",",
    groupSeparator: ".",
    pattern: "! #",
  },
  USD: {
    code: "USD",
    symbol: "$",
    label: "US Dollar",
    // Approximate — update here (or wire to a live rate) as needed; every
    // display and edit path reads from this single source of truth.
    decimals: 2,
    rateFromIDR: 1 / 15800,
    decimalSeparator: ".",
    groupSeparator: ",",
    pattern: "!#",
  },
};

export const DEFAULT_CURRENCY = "IDR";

function money(amount: number, cfg: CurrencyConfig) {
  return currency(amount, {
    symbol: cfg.symbol,
    decimal: cfg.decimalSeparator,
    separator: cfg.groupSeparator,
    precision: cfg.decimals,
    pattern: cfg.pattern,
  });
}

/** Converts an IDR amount into the target currency's numeric value (rounded to its own precision). */
export function convertFromIDR(amountIDR: number, currencyCode: string): number {
  const cfg = CURRENCIES[currencyCode] ?? CURRENCIES[DEFAULT_CURRENCY];
  return money(amountIDR, CURRENCIES.IDR).multiply(cfg.rateFromIDR).value;
}

/** Converts an amount in the given currency back into IDR (rounded to whole Rupiah). */
export function convertToIDR(amount: number, currencyCode: string): number {
  const cfg = CURRENCIES[currencyCode] ?? CURRENCIES[DEFAULT_CURRENCY];
  return Math.round(money(amount, cfg).divide(cfg.rateFromIDR).value);
}

/** Formats an IDR amount for display in the given currency, e.g. "Rp 750.000" or "$47.47". */
export function formatAsCurrency(amountIDR: number, currencyCode: string): string {
  const cfg = CURRENCIES[currencyCode] ?? CURRENCIES[DEFAULT_CURRENCY];
  return money(convertFromIDR(amountIDR, currencyCode), cfg).format();
}

// ---------- Editable-input helpers (typing in whatever currency is active) ----------

/** Strips everything except digits and this currency's own decimal separator, keeping only the first one and capping fraction digits at its precision. */
export function sanitizeAmountInput(raw: string, currencyCode: string): string {
  const cfg = CURRENCIES[currencyCode] ?? CURRENCIES[DEFAULT_CURRENCY];
  const allowed = new RegExp(`[^0-9${cfg.decimalSeparator === "." ? "." : ","}]`, "g");
  const cleaned = raw.replace(allowed, "");
  const [head, ...rest] = cleaned.split(cfg.decimalSeparator);
  if (cfg.decimals === 0) return head;
  if (rest.length === 0) return head;
  return `${head}${cfg.decimalSeparator}${rest.join("").slice(0, cfg.decimals)}`;
}

/** Parses sanitized input text (see above) into a plain number. */
export function parseAmountInput(raw: string, currencyCode: string): number {
  const cfg = CURRENCIES[currencyCode] ?? CURRENCIES[DEFAULT_CURRENCY];
  const normalized = raw.split(cfg.decimalSeparator).join(".");
  return Number(normalized) || 0;
}

/** Adds thousands grouping to sanitized input text while the user is still typing (preserves a trailing decimal separator / partial fraction). */
export function formatAmountInput(raw: string, currencyCode: string): string {
  const cfg = CURRENCIES[currencyCode] ?? CURRENCIES[DEFAULT_CURRENCY];
  const [head, frac] = raw.split(cfg.decimalSeparator);
  const groupedHead = (head || "").replace(/\B(?=(\d{3})+(?!\d))/g, cfg.groupSeparator);
  if (frac === undefined) return groupedHead;
  return `${groupedHead}${cfg.decimalSeparator}${frac}`;
}

/** The plain-number string (in `currencyCode`) to show/edit for a given IDR amount. */
export function idrToInputValue(amountIDR: number, currencyCode: string): string {
  const cfg = CURRENCIES[currencyCode] ?? CURRENCIES[DEFAULT_CURRENCY];
  const converted = convertFromIDR(amountIDR, currencyCode);
  return cfg.decimals === 0 ? String(Math.round(converted)) : converted.toFixed(cfg.decimals);
}

/** The decimal string Shopify's variant price field expects, e.g. "750000.00". */
export function toShopifyPriceString(amountIDR: number): string {
  return Math.round(amountIDR).toFixed(2);
}
