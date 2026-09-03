import { fetchMarketPrice, fetchVariantContextualPrices } from "@/lib/shopify-admin";

export const runtime = "nodejs";

const EMPTY_RESPONSE = { currencyCode: "EUR", multipliers: { journal: 1, charm: 1, pouch: 1 }, variantPrices: {} };

/**
 * Powers the customizer's auto currency switch (see CurrencyContext.tsx):
 * given a visitor's country (passed in by the theme embed, which already
 * knows it via Shopify's own `localization.country`), returns the currency
 * code, a fallback EUR->market multiplier per product family, and (when
 * `variantIds` is given) the exact contextual price for those specific
 * variants -- so every price shown during customization matches what the
 * same visitor would see at Shopify checkout.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const country = searchParams.get("country");

  if (!country) {
    return Response.json(EMPTY_RESPONSE);
  }

  const variantIds = (searchParams.get("variantIds") ?? "").split(",").filter(Boolean);
  const countryCode = country.toUpperCase();

  const [market, variantPrices] = await Promise.all([
    fetchMarketPrice(countryCode),
    fetchVariantContextualPrices(variantIds, countryCode),
  ]);

  if (!market) {
    return Response.json(EMPTY_RESPONSE);
  }

  return Response.json({ ...market, variantPrices }, { headers: { "Cache-Control": "public, max-age=300" } });
}
