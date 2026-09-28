import "server-only";
import { shopifyAdmin } from "@/lib/admin/shopify-admin-data";
import { readCzLedger } from "@/lib/admin/cz-ledger";
import { fetchCzUses } from "@/lib/admin/cz-usage";

/**
 * What's left of every counted asset, published for the storefront in the shop metafield
 * `sanaya.cz_stock_public` (JSON), which the theme's snippets/sanaya-cz-catalog.liquid reads to
 * fill each asset's `stock` and the `soldOut` lists:
 *
 *   { "updated_at": "...", "cover": { "classic-black": 4 }, "charm": { "7": 0 }, ... }
 *
 * One JSON value rather than a metaobject per asset: Liquid can only loop over 50 metaobject
 * entries, and there are well over 100 assets. An asset that was never counted is left out, so the
 * theme treats it as untracked (still for sale) rather than sold out.
 *
 * The ledger (sanaya.cz_stock) stays the source of truth: a count plus when it was taken. This is
 * derived from it (count minus what orders used since), so rebuilding it is always safe; it runs
 * after every stock change in the admin and on every order created or cancelled (webhook).
 */
const NAMESPACE = "sanaya";
const KEY = "cz_stock_public";

export async function syncStorefrontStock(): Promise<{ assets: number; truncated: boolean }> {
  const ledger = await readCzLedger();
  // Only real "kind:id" counts; anything else in the ledger (e.g. a leftover test key) is skipped.
  const entries = Object.entries(ledger).filter(([key, e]) => /^[a-z]+:[^:]+$/.test(key) && Number.isInteger(e?.qty) && typeof e?.asOf === "string");
  const oldest = entries.map(([, e]) => e.asOf).sort()[0] ?? null;
  const { uses, truncated } = oldest ? await fetchCzUses(oldest) : { uses: [], truncated: false };

  const out: Record<string, Record<string, number> | string> = { updated_at: new Date().toISOString() };
  for (const [key, e] of entries) {
    const i = key.indexOf(":");
    const kind = key.slice(0, i);
    const id = key.slice(i + 1);
    const used = uses.filter((u) => u.key === key && u.at > e.asOf).length;
    ((out[kind] ??= {}) as Record<string, number>)[id] = Math.max(0, e.qty - used);
  }

  const shop = await shopifyAdmin<{ shop: { id: string } }>(`query { shop { id } }`);
  const result = await shopifyAdmin<{ metafieldsSet: { userErrors: { message: string }[] } }>(
    `mutation($m: [MetafieldsSetInput!]!) { metafieldsSet(metafields: $m) { userErrors { message } } }`,
    { m: [{ ownerId: shop.shop.id, namespace: NAMESPACE, key: KEY, type: "json", value: JSON.stringify(out) }] }
  );
  if (result.metafieldsSet.userErrors.length) {
    throw new Error(`Failed to publish storefront stock: ${JSON.stringify(result.metafieldsSet.userErrors)}`);
  }
  return { assets: entries.length, truncated };
}
