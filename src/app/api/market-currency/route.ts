import { fetchMarketPrice } from "@/lib/shopify-admin";

export const runtime = "nodejs";

/**
 * Powers the customizer's auto currency switch (see CurrencyContext.tsx):
 * given a visitor's country (passed in by the theme embed, which already
 * knows it via Shopify's own `localization.country`), returns the currency
 * code and EUR->market multiplier so every price shown during customization
 * matches what the same visitor would see at Shopify checkout.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const country = searchParams.get("country");

  if (!country) {
    return Response.json({ currencyCode: "EUR", multiplier: 1 });
  }

  const market = await fetchMarketPrice(country.toUpperCase());
  if (!market) {
    return Response.json({ currencyCode: "EUR", multiplier: 1 });
  }

  return Response.json(market, { headers: { "Cache-Control": "public, max-age=300" } });
}
